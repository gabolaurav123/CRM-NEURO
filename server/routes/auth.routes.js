import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { signAdminToken, verifyAdminPassword } from '../auth.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    if (!configuredEmail || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
      return res.status(503).json({ error: 'ADMIN_AUTH_NOT_CONFIGURED' });
    }

    if (!email || !password || email !== configuredEmail) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const validPassword = await verifyAdminPassword(password);
    if (!validPassword) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const token = signAdminToken(configuredEmail);
    return res.json({
      token,
      admin: {
        email: configuredEmail
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

router.post('/logout', requireAuth, (req, res) => {
  res.json({ ok: true });
});

export default router;
