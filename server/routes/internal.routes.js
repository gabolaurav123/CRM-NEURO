import { Router } from 'express';
import { activeCrmPayload, getActiveWhatsappCrm, setActiveWhatsappCrm } from '../services/activeCrmService.js';
import { normalizeCrmKey } from '../utils/crm.js';

const router = Router();

router.get('/active-crm', async (req, res, next) => {
  try {
    const crmKey = await getActiveWhatsappCrm();
    res.json(activeCrmPayload(crmKey));
  } catch (error) {
    next(error);
  }
});

router.post('/active-crm', async (req, res, next) => {
  try {
    const crmKey = normalizeCrmKey(req.body?.crm_key || req.body?.crmKey || req.query?.crm_key);
    await setActiveWhatsappCrm(crmKey);
    res.json(activeCrmPayload(crmKey));
  } catch (error) {
    next(error);
  }
});

router.get('/whatsapp/active-crm', async (req, res, next) => {
  try {
    const crmKey = await getActiveWhatsappCrm();
    res.json(activeCrmPayload(crmKey));
  } catch (error) {
    next(error);
  }
});

export default router;
