import { verifyAdminToken } from '../auth.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  try {
    const payload = verifyAdminToken(token);
    req.admin = {
      email: payload.sub,
      role: payload.role
    };
    return next();
  } catch (error) {
    const status = error.status || 401;
    return res.status(status).json({ error: 'INVALID_TOKEN' });
  }
}
