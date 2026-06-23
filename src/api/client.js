const TOKEN_KEY = 'crm_neuro_token';
const CRM_KEY = 'crm_neuro_selected_crm';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getSelectedCrm() {
  return localStorage.getItem(CRM_KEY);
}

export function setSelectedCrm(crmKey) {
  localStorage.setItem(CRM_KEY, crmKey);
}

export function clearSelectedCrm() {
  localStorage.removeItem(CRM_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const crmKey = getSelectedCrm();
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(crmKey ? { 'x-crm-key': crmKey } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    if (response.status === 401) clearToken();
    const error = new Error(payload.error || payload.message || 'API_ERROR');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}
