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

  const response = await fetch(`${baseUrl}${ensureLeadingSlash(path)}`, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      'x-admin-api-key': adminKey,
      ...(options.crmKey ? { 'x-crm-key': options.crmKey } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
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

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
