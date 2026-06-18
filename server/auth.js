import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
let cachedConfiguredPasswordHash;

export async function verifyAdminPassword(candidatePassword) {
  const configuredPassword = process.env.ADMIN_PASSWORD || '';
  if (!candidatePassword || !configuredPassword) return false;

  const hash = await getConfiguredPasswordHash(configuredPassword);
  return bcrypt.compare(candidatePassword, hash);
}

async function getConfiguredPasswordHash(configuredPassword) {
  if (BCRYPT_HASH_PATTERN.test(configuredPassword)) {
    return configuredPassword;
  }

  if (!cachedConfiguredPasswordHash) {
    cachedConfiguredPasswordHash = await bcrypt.hash(configuredPassword, 12);
  }

  return cachedConfiguredPasswordHash;
}

export function signAdminToken(email) {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured');
    error.status = 503;
    throw error;
  }

  return jwt.sign({ sub: email, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '12h',
    issuer: 'crm-neuro'
  });
}

export function verifyAdminToken(token) {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured');
    error.status = 503;
    throw error;
  }

  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'crm-neuro'
  });
}
