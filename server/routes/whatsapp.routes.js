import { Router } from 'express';
import { query } from '../db.js';
import { createAdminAction } from '../services/adminActions.js';
import { activeCrmPayload, getActiveWhatsappCrm, setActiveWhatsappCrm } from '../services/activeCrmService.js';
import { chatbotRequest } from '../services/chatbotClient.js';
import { getCrmKey } from '../utils/crm.js';

const router = Router();

router.get('/status', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    const payload = await chatbotRequest('/api/whatsapp/status', { crmKey });
    const status = normalizeWhatsappPayload(payload);
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
    await setActiveWhatsappCrm(crmKey);
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
  return {
    status: data.status || data.connectionStatus || data.state || fallbackStatus,
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

async function storeWhatsappSession(status, crmKey = 'neurotraumas') {
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
      status.last_connected_at || null,
      { source: 'crm_proxy', active_crm_key: crmKey, raw: status.raw || null }
    ]
  );
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
    active_crm_key: 'neurotraumas',
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
