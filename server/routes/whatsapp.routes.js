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
    const payload = await chatbotRequest('/api/whatsapp/qr?force_qr=true&force=true', { crmKey });
    const status = normalizeQrPayload(payload);
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
    const payload = await chatbotRequest('/api/whatsapp/generate-qr?force_qr=true&force=true', {
      method: 'POST',
      crmKey,
      body: {
        ...activeCrmPayload(crmKey),
        force: true,
        force_qr: true,
        forceQr: true
      }
    });
    const status = normalizeQrPayload(payload);
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
    const status = {
      ...normalizeWhatsappPayload(payload, 'disconnected'),
      status: 'disconnected',
      phone: '',
      whatsapp_id: '',
      display_phone: '',
      qr: ''
    };
    await invalidateConnectedWhatsappSessions(crmKey, 'manual_logout');
    await storeWhatsappSession(status, crmKey);
    await createAdminAction({ crmKey, action: 'whatsapp_logout', details: { status: status.status }, adminEmail: req.admin?.email });
    res.json(status);
  } catch (error) {
    next(error);
  }
});

function normalizeWhatsappPayload(payload, fallbackStatus = 'disconnected') {
  const data = payload?.data || payload || {};
  const status = normalizeWhatsappStatus(getWhatsappStatusCandidate(data, fallbackStatus));
  return {
    status,
    phone: firstString(data.phone, data.number, data.connectedNumber, data.session?.phone, data.user?.phone),
    whatsapp_id: firstString(data.whatsapp_id, data.whatsappId, data.id, data.user?.id, data.me?.id, data.info?.wid?._serialized, data.info?.wid, data.clientInfo?.wid?._serialized, data.clientInfo?.wid),
    display_phone: firstString(data.display_phone, data.displayPhone, data.displayNumber, data.me?.number, data.user?.number),
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

function getWhatsappStatusCandidate(data, fallbackStatus) {
  const explicit = firstValue(
    data.status,
    data.connectionStatus,
    data.state,
    data.sessionStatus,
    data.whatsappStatus,
    data.connection?.status,
    data.connection?.state,
    data.session?.status,
    data.client?.status,
    data.client?.state
  );
  if (explicit !== undefined) return explicit;

  if (firstTruthy(data.connected, data.isConnected, data.ready, data.isReady, data.authenticated, data.isAuthenticated, data.loggedIn, data.isLoggedIn)) {
    return 'connected';
  }
  if (data.qr || data.qrCode || data.qr_code || data.image) return 'qr_pending';
  return fallbackStatus;
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function firstTruthy(...values) {
  return values.some((value) => value === true || String(value).trim().toLowerCase() === 'true');
}

function firstString(...values) {
  const value = firstValue(...values);
  if (value === undefined) return '';
  if (typeof value === 'object') return firstString(value._serialized, value.id, value.user, value.number);
  return String(value);
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

function hasWhatsappIdentity(status) {
  return Boolean(status?.phone || status?.whatsapp_id || status?.display_phone);
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
       AND (
         NULLIF(phone, '') IS NOT NULL
         OR NULLIF(whatsapp_id, '') IS NOT NULL
         OR NULLIF(display_phone, '') IS NOT NULL
       )
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

async function invalidateConnectedWhatsappSessions(crmKey, reason) {
  await query(
    `UPDATE whatsapp_sessions
     SET status = 'disconnected',
         updated_at = NOW(),
         metadata = COALESCE(metadata, '{}'::JSONB) || $1::JSONB
     WHERE status = 'connected'`,
    [{ disconnected_by: reason, active_crm_key: crmKey, disconnected_at: new Date().toISOString() }]
  );
}

function normalizeEmptyConnectedStatus(status) {
  if (status.status !== 'connected' || hasWhatsappIdentity(status)) return status;
  return {
    ...status,
    status: 'disconnected',
    warning: 'El chatbot reporto conectado sin numero ni ID; se requiere QR para confirmar la vinculacion.'
  };
}

function normalizeQrPayload(payload) {
  const status = normalizeWhatsappPayload(payload, 'qr_pending');
  if (status.qr) {
    return {
      ...status,
      status: 'qr_pending'
    };
  }

  return {
    ...status,
    status: status.status === 'connected' ? 'qr_pending' : status.status,
    warning: status.status === 'connected'
      ? 'El chatbot reporto conectado, pero no devolvio QR ni confirmacion util de vinculacion.'
      : status.warning
  };
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
