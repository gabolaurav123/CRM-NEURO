import { Router } from 'express';
import { assertNoSensitiveSettings, getSettings, updateSettings } from '../services/settingsService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const values = req.body?.settings || req.body || {};
    assertNoSensitiveSettings(values);

    if (values.hotmart_link !== undefined && typeof values.hotmart_link !== 'string') {
      return res.status(400).json({ error: 'INVALID_HOTMART_LINK' });
    }

    const settings = await updateSettings(values);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;
