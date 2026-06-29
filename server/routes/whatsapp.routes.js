import { Router } from 'express';
import { query } from '../db.js';
import { createAdminAction } from '../services/adminActions.js';
import { activeCrmPayload, getActiveWhatsappCrm, getActiveWhatsappCrmDetails, setActiveWhatsappCrm } from '../services/activeCrmService.js';
import { chatbotRequest } from '../services/chatbotClient.js';
import { syncRecentWhatsappRowsToActiveCrm } from '../services/crmSyncService.js';
import { getCrmKey } from '../utils/crm.js';

const router = Router();

router.get('/active-crm', async (req, res, next) => {
  try {
    const active = await getActiveWhatsappCrmDetails();
    res.json({
      ...activeCrmPayload(active.crmKey),
      active_since: active.startedAt || active.settingUpdatedAt || null
    });
  } catch (error) {
    next(error);
  }
});

router.post('/activate-crm', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    await setActiveWhatsappCrm(crmKey);
    const sync = await syncRecentWhatsappRowsToActiveCrm({ requestedCrmKey: crmKey });
    await createAdminAction({
      crmKey,
      action: 'whatsapp_active_crm_changed',
      details: { active_crm_key: crmKey, sync },
      adminEmail: req.admin?.email
    });
    res.json({ ...activeCrmPayload(crmKey), sync });
  } catch (error) {
    next(error);
  }
});

router.get('/status', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    const payload = await chatbotRequest('/api/whatsapp/status', { crmKey });
    const status = await keepConnectedUnlessManualLogout(normalizeWhatsappPayload(payload));
    await storeWhatsappSession(status, crmKey);
    const activeCrmKey = await getActiveWhatsappCrm();
    res.json({ ...status, active_crm_key: activeCrmKey });
  } catch (error) {
    const fallback = await getLatestWhatsappSession().catch(() => null);
    if (fallback) {
      return res.status(error.status === 503 ? 200 : error.status || 502).json({
        ...fallback,
        warning: error.message,
        source: 'database'
      });
    }
    next(error);
  }
});

router.get('/qr', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    const connected = await getLatestConnectedWhatsappSession();
    if (connected) {
      return res.json({ ...connected, active_crm_key: crmKey, already_connected: true });
    }
    const payload = await chatbotRequest('/api/whatsapp/qr', { crmKey });
    const status = normalizeWhatsappPayload(payload);
    await storeWhatsappSession(status, crmKey);
    res.json({ ...status, active_crm_key: crmKey });
  } catch (error) {
    const fallback = await getLatestWhatsappSession().catch(() => null);
    if (fallback?.qr) {
      return res.status(error.status === 503 ? 200 : error.status || 502).json({
        ...fallback,
        warning: error.message,
        source: 'database'
      });
    }
    next(error);
  }
});

router.post('/generate-qr', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    await setActiveWhatsappCrm(crmKey);
    const connected = await getLatestConnectedWhatsappSession();
    if (connected) {
      await createAdminAction({ crmKey, action: 'whatsapp_generate_qr_skipped_connected', details: { active_crm_key: crmKey }, adminEmail: req.admin?.email });
      return res.json({ ...connected, active_crm_key: crmKey, already_connected: true });
    }
    const payload = await chatbotRequest('/api/whatsapp/generate-qr', { method: 'POST', crmKey, body: activeCrmPayload(crmKey) });
    const status = normalizeWhatsappPayload(payload, 'qr_pending');
    await storeWhatsappSession(status, crmKey);
    await createAdminAction({ crmKey, action: 'whatsapp_generate_qr', details: { status: status.status, active_crm_key: crmKey }, adminEmail: req.admin?.email });
    res.json({ ...status, active_crm_key: crmKey });
  } catch (error) {
    next(error);
  }
});

router.post('/restart', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    await setActiveWhatsappCrm(crmKey);
    const payload = await chatbotRequest('/api/whatsapp/restart', { method: 'POST', crmKey, body: activeCrmPayload(crmKey) });
    const status = normalizeWhatsappPayload(payload, 'initializing');
    await storeWhatsappSession(status, crmKey);
    await createAdminAction({ crmKey, action: 'whatsapp_restart', details: { status: status.status, active_crm_key: crmKey }, adminEmail: req.admin?.email });
    res.json({ ...status, active_crm_key: crmKey });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    const payload = await chatbotRequest('/api/whatsapp/logout', { method: 'POST', crmKey });
    const status = normalizeWhatsappPayload(payload, 'disconnected');
    await storeWhatsappSession(status, crmKey);
    await createAdminAction({ crmKey, action: 'whatsapp_logout', details: { status: status.status }, adminEmail: req.admin?.email });
    res.json(status);
  } catch (error) {
    next(error);
  }
});

function normalizeWhatsappPayload(payload, fallbackStatus = 'disconnected') {
  const data = payload?.data || payload || {};
  const status = normalizeWhatsappStatus(data.status || data.connectionStatus || data.state || fallbackStatus);
  return {
    status,
    phone: data.phone || data.number || data.connectedNumber || '',
    whatsapp_id: data.whatsapp_id || data.whatsappId || data.id || data.user?.id || '',
    display_phone: data.display_phone || data.displayPhone || data.displayNumber || '',
    qr: data.qr || data.qrCode || data.qr_code || data.image || '',
    last_qr_at: data.last_qr_at || data.lastQrAt || data.qrGeneratedAt || null,
    last_connected_at: data.last_connected_at || data.lastConnectedAt || data.connectedAt || null,
    updated_at: new Date().toISOString(),
    raw: payload
  };
}

async function storeWhatsappSession(status, crmKey = 'holograficas') {
  const connectedAt = status.last_connected_at || (status.status === 'connected' ? new Date().toISOString() : null);
  await query(
    `INSERT INTO whatsapp_sessions (status, crm_key, phone, whatsapp_id, display_phone, qr_code, last_qr_at, last_connected_at, updated_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
    [
      status.status,
      crmKey,
      status.phone || null,
      status.whatsapp_id || null,
      status.display_phone || null,
      status.qr || null,
      status.last_qr_at || null,
      connectedAt,
      { source: 'crm_proxy', active_crm_key: crmKey, raw: status.raw || null }
    ]
  );
}

async function keepConnectedUnlessManualLogout(status) {
  if (status.status !== 'disconnected') return status;
  if (status.phone || status.whatsapp_id || status.display_phone || status.qr) return status;

  const connected = await getLatestConnectedWhatsappSession();
  if (!connected) return status;

  return {
    ...connected,
    status: 'connected',
    raw: status.raw,
    warning: 'El chatbot reporto un cierre pasivo, se conserva la sesion conectada hasta desconexion manual.'
  };
}

function normalizeWhatsappStatus(value) {
  if (value === true) return 'connected';
  if (value === false) return 'disconnected';
  const status = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['connected', 'open', 'ready', 'authenticated', 'logged_in', 'loggedin', 'online', 'paired', 'working'].includes(status)) return 'connected';
  if (['qr', 'qrcode', 'qr_code', 'qr_pending', 'pending_qr', 'scan_qr', 'pairing'].includes(status)) return 'qr_pending';
  if (['initializing', 'loading', 'connecting', 'reconnecting', 'starting', 'opening'].includes(status)) return 'initializing';
  if (['disconnected', 'disconnect', 'closed', 'close', 'logged_out', 'logout', 'not_connected', 'unpaired'].includes(status)) return 'disconnected';
  return status || 'disconnected';
}

async function getLatestConnectedWhatsappSession() {
  const result = await query(
      `SELECT status,
            crm_key AS active_crm_key,
            phone,
            whatsapp_id,
            display_phone,
            qr_code AS qr,
            last_qr_at,
            last_connected_at,
            updated_at
     FROM whatsapp_sessions
     WHERE status = 'connected'
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

async function getLatestWhatsappSession() {
  const result = await query(
      `SELECT status,
            crm_key AS active_crm_key,
            phone,
            whatsapp_id,
            display_phone,
            qr_code AS qr,
            last_qr_at,
            last_connected_at,
            updated_at
     FROM whatsapp_sessions
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`
  );

  return result.rows[0] || {
    status: 'disconnected',
    active_crm_key: 'holograficas',
    phone: '',
    whatsapp_id: '',
    display_phone: '',
    qr: '',
    last_qr_at: null,
    last_connected_at: null,
    updated_at: null
  };
}

export default router;
