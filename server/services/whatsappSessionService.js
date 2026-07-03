import { query, hasDatabaseUrl } from '../db.js';
import { activeCrmPayload, getActiveWhatsappCrm } from './activeCrmService.js';
import { chatbotRequest } from './chatbotClient.js';

const DEFAULT_KEEPALIVE_INTERVAL_MS = 2 * 60 * 1000;
const DEFAULT_RESTART_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_PROACTIVE_RESTART_MS = 4 * 60 * 60 * 1000;
const MIN_KEEPALIVE_INTERVAL_MS = 30 * 1000;
const MIN_RESTART_COOLDOWN_MS = 60 * 1000;
const MIN_PROACTIVE_RESTART_MS = 30 * 60 * 1000;

let keepAliveTimer = null;
let keepAliveRunning = false;
let lastRecoveryAt = 0;
let lastProactiveRestartAt = 0;

export async function getLiveWhatsappStatus(crmKey, options = {}) {
  const activeCrmKey = crmKey || await getActiveWhatsappCrm();
  const payload = await chatbotRequest('/api/whatsapp/status', { crmKey: activeCrmKey });
  const status = normalizeWhatsappPayload(payload);
  await storeWhatsappSession(status, activeCrmKey, {
    source: options.source || 'status',
    raw_status: status.status
  });

  if (options.recover !== false) {
    return recoverWhatsappIfNeeded(status, activeCrmKey, options.source || 'status');
  }

  return status;
}

export async function recoverWhatsappIfNeeded(status, crmKey, source = 'status') {
  if (status.status === 'connected') return status;

  const connected = await getLatestConnectedWhatsappSession();
  if (!connected) return status;

  const now = Date.now();
  const cooldownMs = readDuration('WHATSAPP_KEEPALIVE_RESTART_COOLDOWN_MS', DEFAULT_RESTART_COOLDOWN_MS, MIN_RESTART_COOLDOWN_MS);
  if (now - lastRecoveryAt < cooldownMs) {
    return {
      ...status,
      warning: `WhatsApp reporto ${status.status}. Ya se intento reactivar hace poco; se mantiene en vigilancia.`
    };
  }

  lastRecoveryAt = now;
  const payload = await chatbotRequest('/api/whatsapp/restart', {
    method: 'POST',
    crmKey,
    body: {
      ...activeCrmPayload(crmKey),
      reason: `auto_recover_${source}`,
      preserve_session: true,
      preserveSession: true
    }
  });
  const recovered = normalizeWhatsappPayload(payload, 'initializing');
  await storeWhatsappSession(recovered, crmKey, {
    source: 'auto_recover',
    reason: source,
    previous_status: status.status
  });

  return {
    ...recovered,
    recovery_attempted: true,
    warning: recovered.status === 'qr_pending'
      ? 'Se intento reactivar WhatsApp, pero el chatbot pidio QR. Si esto continua, WhatsApp invalido la sesion y exige vincular de nuevo.'
      : `WhatsApp reporto ${status.status}; se envio reinicio automatico para mantener el bot activo.`
  };
}

export async function restartWhatsappSession(crmKey, source = 'manual_restart') {
  const payload = await chatbotRequest('/api/whatsapp/restart', {
    method: 'POST',
    crmKey,
    body: {
      ...activeCrmPayload(crmKey),
      reason: source,
      preserve_session: source !== 'manual_logout',
      preserveSession: source !== 'manual_logout'
    }
  });
  const status = normalizeWhatsappPayload(payload, 'initializing');
  await storeWhatsappSession(status, crmKey, { source });
  return status;
}

export async function requestWhatsappQr(crmKey, method = 'GET') {
  const path = method === 'POST'
    ? '/api/whatsapp/generate-qr?force_qr=true&force=true'
    : '/api/whatsapp/qr?force_qr=true&force=true';
  const payload = await chatbotRequest(path, {
    method,
    crmKey,
    body: method === 'POST'
      ? {
          ...activeCrmPayload(crmKey),
          force: true,
          force_qr: true,
          forceQr: true
        }
      : undefined
  });
  return normalizeQrPayload(payload);
}

export function startWhatsappKeepAlive() {
  if (keepAliveTimer || isDisabled(process.env.WHATSAPP_KEEPALIVE_ENABLED)) return;

  const intervalMs = readDuration('WHATSAPP_KEEPALIVE_INTERVAL_MS', DEFAULT_KEEPALIVE_INTERVAL_MS, MIN_KEEPALIVE_INTERVAL_MS);
  const run = () => {
    void runWhatsappKeepAlive().catch((error) => {
      console.error('[whatsapp-keepalive]', error.message);
    });
  };

  keepAliveTimer = setInterval(run, intervalMs);
  keepAliveTimer.unref?.();
  setTimeout(run, 15 * 1000).unref?.();
  console.log(`[whatsapp-keepalive] enabled every ${Math.round(intervalMs / 1000)}s`);
}

async function runWhatsappKeepAlive() {
  if (keepAliveRunning || !hasDatabaseUrl() || !process.env.CHATBOT_API_URL || !process.env.ADMIN_API_KEY) return;
  keepAliveRunning = true;
  try {
    const connected = await getLatestConnectedWhatsappSession();
    if (!connected) return;

    const crmKey = await getActiveWhatsappCrm();
    const status = await getLiveWhatsappStatus(crmKey, { source: 'keepalive', recover: true });
    if (status.status !== 'connected') {
      console.warn(`[whatsapp-keepalive] status=${status.status}${status.recovery_attempted ? ' recovery_attempted=true' : ''}`);
    } else if (!status.recovery_attempted) {
      await proactiveRestartIfDue(crmKey);
    }
  } finally {
    keepAliveRunning = false;
  }
}

async function proactiveRestartIfDue(crmKey) {
  const proactiveRestartMs = readOptionalDuration('WHATSAPP_KEEPALIVE_PROACTIVE_RESTART_MS', DEFAULT_PROACTIVE_RESTART_MS, MIN_PROACTIVE_RESTART_MS);
  if (!proactiveRestartMs) return null;

  const now = Date.now();
  if (lastProactiveRestartAt && now - lastProactiveRestartAt < proactiveRestartMs) return null;

  lastProactiveRestartAt = now;
  const status = await restartWhatsappSession(crmKey, 'proactive_keepalive_restart');
  console.log(`[whatsapp-keepalive] proactive restart status=${status.status}`);
  return status;
}

export function normalizeWhatsappPayload(payload, fallbackStatus = 'disconnected') {
  const data = payload?.data || payload || {};
  const status = normalizeWhatsappStatus(getWhatsappStatusCandidate(data, fallbackStatus));
  return {
    status,
    phone: firstString(data.phone, data.number, data.connectedNumber, data.session?.phone, data.user?.phone),
    whatsapp_id: firstString(data.whatsapp_id, data.whatsappId, data.id, data.user?.id, data.me?.id, data.info?.wid?._serialized, data.info?.wid, data.clientInfo?.wid?._serialized, data.clientInfo?.wid),
    display_phone: firstString(data.display_phone, data.displayPhone, data.displayNumber, data.me?.number, data.user?.number),
    qr: data.qr || data.qrCode || data.qr_code || data.image || '',
    last_qr_at: data.last_qr_at || data.lastQrAt || data.qrGeneratedAt || null,
    last_connected_at: data.last_connected_at || data.lastConnectedAt || data.connectedAt || null,
    updated_at: new Date().toISOString(),
    raw: payload
  };
}

export async function storeWhatsappSession(status, crmKey = 'holograficas', metadata = {}) {
  const connectedAt = status.last_connected_at || (status.status === 'connected' ? new Date().toISOString() : null);
  await query(
    `INSERT INTO whatsapp_sessions (status, crm_key, phone, whatsapp_id, display_phone, qr_code, last_qr_at, last_connected_at, updated_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
    [
      status.status,
      crmKey,
      status.phone || null,
      status.whatsapp_id || null,
      status.display_phone || null,
      status.qr || null,
      status.last_qr_at || null,
      connectedAt,
      { source: 'crm_proxy', active_crm_key: crmKey, ...metadata, raw: status.raw || null }
    ]
  );
}

export function normalizeQrPayload(payload) {
  const status = normalizeWhatsappPayload(payload, 'qr_pending');
  if (status.qr) {
    return {
      ...status,
      status: 'qr_pending'
    };
  }

  return {
    ...status,
    status: status.status === 'connected' ? 'connected' : status.status,
    warning: status.status === 'connected'
      ? 'WhatsApp ya esta conectado.'
      : status.warning
  };
}

export async function getLatestConnectedWhatsappSession() {
  const result = await query(
      `SELECT status,
            crm_key AS active_crm_key,
            phone,
            whatsapp_id,
            display_phone,
            qr_code AS qr,
            last_qr_at,
            last_connected_at,
            updated_at
     FROM whatsapp_sessions
     WHERE status = 'connected'
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

export async function getLatestWhatsappSession() {
  const result = await query(
      `SELECT status,
            crm_key AS active_crm_key,
            phone,
            whatsapp_id,
            display_phone,
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
    active_crm_key: 'holograficas',
    phone: '',
    whatsapp_id: '',
    display_phone: '',
    qr: '',
    last_qr_at: null,
    last_connected_at: null,
    updated_at: null
  };
}

export async function invalidateConnectedWhatsappSessions(crmKey, reason) {
  await query(
    `UPDATE whatsapp_sessions
     SET status = 'disconnected',
         updated_at = NOW(),
         metadata = COALESCE(metadata, '{}'::JSONB) || $1::JSONB
     WHERE status = 'connected'`,
    [{ disconnected_by: reason, active_crm_key: crmKey, disconnected_at: new Date().toISOString() }]
  );
}

function getWhatsappStatusCandidate(data, fallbackStatus) {
  const explicit = firstValue(
    data.status,
    data.connectionStatus,
    data.state,
    data.sessionStatus,
    data.whatsappStatus,
    data.connection?.status,
    data.connection?.state,
    data.session?.status,
    data.client?.status,
    data.client?.state
  );
  if (explicit !== undefined) return explicit;

  if (firstTruthy(data.connected, data.isConnected, data.ready, data.isReady, data.authenticated, data.isAuthenticated, data.loggedIn, data.isLoggedIn)) {
    return 'connected';
  }
  if (data.qr || data.qrCode || data.qr_code || data.image) return 'qr_pending';
  return fallbackStatus;
}

function normalizeWhatsappStatus(value) {
  if (value === true) return 'connected';
  if (value === false) return 'disconnected';
  const status = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['connected', 'open', 'ready', 'authenticated', 'logged_in', 'loggedin', 'online', 'paired', 'working'].includes(status)) return 'connected';
  if (['qr', 'qrcode', 'qr_code', 'qr_pending', 'pending_qr', 'scan_qr', 'pairing'].includes(status)) return 'qr_pending';
  if (['initializing', 'loading', 'connecting', 'reconnecting', 'starting', 'opening'].includes(status)) return 'initializing';
  if (['disconnected', 'disconnect', 'closed', 'close', 'logged_out', 'logout', 'not_connected', 'unpaired'].includes(status)) return 'disconnected';
  return status || 'disconnected';
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function firstTruthy(...values) {
  return values.some((value) => value === true || String(value).trim().toLowerCase() === 'true');
}

function firstString(...values) {
  const value = firstValue(...values);
  if (value === undefined) return '';
  if (typeof value === 'object') return firstString(value._serialized, value.id, value.user, value.number);
  return String(value);
}

function readDuration(envName, fallback, min) {
  const value = Number(process.env[envName]);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(value, min);
}

function readOptionalDuration(envName, fallback, min) {
  const raw = process.env[envName];
  if (raw !== undefined && Number(raw) === 0) return 0;
  const value = Number(raw || fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(value, min);
}

function isDisabled(value) {
  return ['0', 'false', 'no', 'off', 'disabled'].includes(String(value || '').trim().toLowerCase());
}
