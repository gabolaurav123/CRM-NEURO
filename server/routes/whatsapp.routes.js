import { Router } from 'express';
import { createAdminAction } from '../services/adminActions.js';
import { activeCrmPayload, getActiveWhatsappCrm, getActiveWhatsappCrmDetails, setActiveWhatsappCrm } from '../services/activeCrmService.js';
import { chatbotRequest } from '../services/chatbotClient.js';
import { syncRecentWhatsappRowsToActiveCrm } from '../services/crmSyncService.js';
import {
  getLiveWhatsappStatus,
  getLatestWhatsappSession,
  invalidateConnectedWhatsappSessions,
  normalizeWhatsappPayload,
  requestWhatsappQr,
  restartWhatsappSession,
  storeWhatsappSession
} from '../services/whatsappSessionService.js';
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
    const status = await getLiveWhatsappStatus(crmKey, { source: 'status_route', recover: true });
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
    const live = await getLiveWhatsappStatus(crmKey, { source: 'qr_route', recover: true });
    if (live.status === 'connected' || (live.recovery_attempted && live.status !== 'qr_pending' && !live.qr)) {
      return res.json({ ...live, active_crm_key: crmKey, already_connected: live.status === 'connected' });
    }

    const status = await requestWhatsappQr(crmKey, 'GET');
    await storeWhatsappSession(status, crmKey, { source: 'qr_route' });
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

    const live = await getLiveWhatsappStatus(crmKey, { source: 'generate_qr_route', recover: true });
    if (live.status === 'connected' || (live.recovery_attempted && live.status !== 'qr_pending' && !live.qr)) {
      await createAdminAction({
        crmKey,
        action: 'whatsapp_generate_qr_skipped_connected',
        details: { status: live.status, active_crm_key: crmKey, recovery_attempted: Boolean(live.recovery_attempted) },
        adminEmail: req.admin?.email
      });
      return res.json({ ...live, active_crm_key: crmKey, already_connected: live.status === 'connected' });
    }

    const status = await requestWhatsappQr(crmKey, 'POST');
    await storeWhatsappSession(status, crmKey, { source: 'generate_qr_route' });
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
    const status = await restartWhatsappSession(crmKey, 'manual_restart');
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
    await storeWhatsappSession(status, crmKey, { source: 'manual_logout' });
    await createAdminAction({ crmKey, action: 'whatsapp_logout', details: { status: status.status }, adminEmail: req.admin?.email });
    res.json(status);
  } catch (error) {
    next(error);
  }
});

export default router;
