export class ChatbotClientError extends Error {
  constructor(message, status = 502, payload = null) {
    super(message);
    this.name = 'ChatbotClientError';
    this.status = status;
    this.payload = payload;
  }
}

export async function chatbotRequest(path, options = {}) {
  const baseUrl = normalizeBaseUrl(process.env.CHATBOT_API_URL);
  const adminKey = process.env.ADMIN_API_KEY;

  if (!baseUrl || !adminKey) {
    throw new ChatbotClientError('CHATBOT_API_URL or ADMIN_API_KEY is not configured', 503);
  }

  const requestPath = options.crmKey ? appendCrmQuery(ensureLeadingSlash(path), options.crmKey) : ensureLeadingSlash(path);
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      'x-admin-api-key': adminKey,
      ...(options.crmKey
        ? {
            'x-crm-key': options.crmKey,
            'x-active-crm-key': options.crmKey,
            'x-whatsapp-active-crm-key': options.crmKey
          }
        : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(withCrmBody(options.body, options.crmKey)) : undefined
  });

  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new ChatbotClientError(payload?.error || payload?.message || 'Chatbot request failed', response.status, payload);
  }

  return payload ?? {};
}

export async function optionalChatbotRequest(path, options = {}) {
  try {
    const data = await chatbotRequest(path, options);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      status: error.status || 502,
      payload: error.payload || null
    };
  }
}

export function assertChatbotSuccess(payload, fallbackMessage = 'Chatbot did not confirm delivery') {
  const data = payload?.data || payload || {};
  const failed = data.ok === false || data.success === false || data.sent === false || data.delivered === false;

  if (failed) {
    throw new ChatbotClientError(data.error || data.message || fallbackMessage, 502, payload);
  }
}

function normalizeBaseUrl(value) {
  if (!value) return '';
  return value.replace(/\/+$/, '');
}

function ensureLeadingSlash(value) {
  return value.startsWith('/') ? value : `/${value}`;
}

function appendCrmQuery(path, crmKey) {
  const separator = path.includes('?') ? '&' : '?';
  const encoded = encodeURIComponent(crmKey);
  return `${path}${separator}crm_key=${encoded}&active_crm_key=${encoded}&whatsapp_active_crm_key=${encoded}`;
}

function withCrmBody(body, crmKey) {
  if (!crmKey || !body || typeof body !== 'object' || Array.isArray(body)) return body;
  return {
    crm_key: crmKey,
    crmKey,
    active_crm_key: crmKey,
    whatsapp_active_crm_key: crmKey,
    ...body
  };
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
