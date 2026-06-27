export const VALID_CRM_KEYS = new Set(['neurotraumas', 'holograficas']);
export const DEFAULT_CRM_KEY = 'holograficas';

export function getCrmKey(req) {
  const raw = req.headers['x-crm-key'] || req.query?.crm_key || req.query?.crm;
  return normalizeCrmKey(raw);
}

export function normalizeCrmKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return VALID_CRM_KEYS.has(key) ? key : DEFAULT_CRM_KEY;
}

export function crmWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `COALESCE(${prefix}crm_key, '${DEFAULT_CRM_KEY}')`;
}
