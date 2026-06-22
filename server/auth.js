import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const cachedPasswordHashes = new Map();

export async function verifyAdminPassword(candidatePassword) {
  const configuredPassword = process.env.ADMIN_PASSWORD || '';
  if (!candidatePassword || !configuredPassword) return false;

  const hash = await getPasswordHash(configuredPassword);
  return bcrypt.compare(candidatePassword, hash);
}

export async function verifyAdminCredentials(candidateIdentity, candidatePassword) {
  const identity = normalizeIdentity(candidateIdentity);
  if (!identity || !candidatePassword) return null;

  for (const admin of getConfiguredAdmins()) {
    if (admin.identity !== identity) continue;

    const hash = await getPasswordHash(admin.password);
    const valid = await bcrypt.compare(candidatePassword, hash);
    if (!valid) return null;

    return {
      identity: admin.identity,
      displayName: admin.displayName
    };
  }

  return null;
}

export function hasConfiguredAdmins() {
  return getConfiguredAdmins().length > 0;
}

export function signAdminToken(identity) {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured');
    error.status = 503;
    throw error;
  }

  return jwt.sign({ sub: identity, role: 'admin' }, process.env.JWT_SECRET, {
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

async function getPasswordHash(configuredPassword) {
  if (BCRYPT_HASH_PATTERN.test(configuredPassword)) {
    return configuredPassword;
  }

  if (!cachedPasswordHashes.has(configuredPassword)) {
    cachedPasswordHashes.set(configuredPassword, await bcrypt.hash(configuredPassword, 12));
  }

  return cachedPasswordHashes.get(configuredPassword);
}

function getConfiguredAdmins() {
  const admins = [];
  const primaryIdentity = normalizeIdentity(process.env.ADMIN_EMAIL || '');

  if (primaryIdentity && process.env.ADMIN_PASSWORD) {
    admins.push({
      identity: primaryIdentity,
      displayName: String(process.env.ADMIN_EMAIL || '').trim(),
      password: process.env.ADMIN_PASSWORD
    });
  }

  for (const entry of parseExtraAdmins(process.env.ADMIN_EXTRA_USERS || '')) {
    admins.push(entry);
  }

  return admins;
}

function parseExtraAdmins(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf(':');
      if (separator <= 0) return null;

      const displayName = item.slice(0, separator).trim();
      const password = item.slice(separator + 1).trim();
      if (!displayName || !password) return null;

      return {
        identity: normalizeIdentity(displayName),
        displayName,
        password
      };
    })
    .filter(Boolean);
}

function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}
