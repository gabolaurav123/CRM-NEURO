export function requireInternalApiKey(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY || '';
  const providedKey = req.headers['x-admin-api-key'] || req.headers['x-internal-api-key'] || '';

  if (!configuredKey) {
    return res.status(503).json({ error: 'ADMIN_API_KEY_NOT_CONFIGURED' });
  }

  if (providedKey !== configuredKey) {
    return res.status(401).json({ error: 'INVALID_INTERNAL_API_KEY' });
  }

  return next();
}
