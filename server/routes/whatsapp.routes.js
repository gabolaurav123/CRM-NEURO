import { Router } from 'express';
import { query } from '../db.js';
import { createAdminAction } from '../services/adminActions.js';
import { chatbotRequest } from '../services/chatbotClient.js';

const router = Router();

router.get('/status', async (req, res, next) => {
  try {
    const payload = await chatbotRequest('/api/whatsapp/status');
    const status = normalizeWhatsappPayload(payload);
    await storeWhatsappSession(status);
    res.json(status);
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
    const payload = await chatbotRequest('/api/whatsapp/qr');
    const status = normalizeWhatsappPayload(payload);
    await storeWhatsappSession(status);
    res.json(status);
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
    const payload = await chatbotRequest('/api/whatsapp/generate-qr', { method: 'POST' });
    const status = normalizeWhatsappPayload(payload, 'qr_pending');
    await storeWhatsappSession(status);
    await createAdminAction({ action: 'whatsapp_generate_qr', details: { status: status.status }, adminEmail: req.admin?.email });
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.post('/restart', async (req, res, next) => {
  try {
    const payload = await chatbotRequest('/api/whatsapp/restart', { method: 'POST' });
    const status = normalizeWhatsappPayload(payload, 'initializing');
    await storeWhatsappSession(status);
    await createAdminAction({ action: 'whatsapp_restart', details: { status: status.status }, adminEmail: req.admin?.email });
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const payload = await chatbotRequest('/api/whatsapp/logout', { method: 'POST' });
    const status = normalizeWhatsappPayload(payload, 'disconnected');
    await storeWhatsappSession(status);
    await createAdminAction({ action: 'whatsapp_logout', details: { status: status.status }, adminEmail: req.admin?.email });
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
    qr: data.qr || data.qrCode || data.qr_code || data.image || '',
    last_qr_at: data.last_qr_at || data.lastQrAt || data.qrGeneratedAt || null,
    last_connected_at: data.last_connected_at || data.lastConnectedAt || data.connectedAt || null,
    updated_at: new Date().toISOString(),
    raw: payload
  };
}

async function storeWhatsappSession(status) {
  await query(
    `INSERT INTO whatsapp_sessions (status, phone, qr_code, last_qr_at, last_connected_at, updated_at, metadata)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
    [
      status.status,
      status.phone || null,
      status.qr || null,
      status.last_qr_at || null,
      status.last_connected_at || null,
      { source: 'crm_proxy', raw: status.raw || null }
    ]
  );
}

async function getLatestWhatsappSession() {
  const result = await query(
    `SELECT status,
            phone,
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
    phone: '',
    qr: '',
    last_qr_at: null,
    last_connected_at: null,
    updated_at: null
  };
}

export default router;
