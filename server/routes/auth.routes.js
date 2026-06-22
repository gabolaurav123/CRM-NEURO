import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { hasConfiguredAdmins, signAdminToken, verifyAdminCredentials } from '../auth.js';
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
    const identity = String(req.body?.email || req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!hasConfiguredAdmins() || !process.env.JWT_SECRET) {
      return res.status(503).json({ error: 'ADMIN_AUTH_NOT_CONFIGURED' });
    }

    if (!identity || !password) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const admin = await verifyAdminCredentials(identity, password);
    if (!admin) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const token = signAdminToken(admin.identity);
    return res.json({
      token,
      admin: {
        email: admin.displayName
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
