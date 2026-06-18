const WHATSAPP_NET_SUFFIX = '@s.whatsapp.net';
const WHATSAPP_LID_SUFFIX = '@lid';

export function isRealPhone(value) {
  if (typeof value !== 'string') return false;

  const text = value.trim();
  if (!text) return false;
  if (text.includes('@') || /@lid/i.test(text) || /@s\.whatsapp\.net/i.test(text)) return false;
  if (/[a-z]/i.test(text)) return false;

  const normalized = normalizePhoneCandidate(text);
  if (!/^\+?\d+$/.test(normalized)) return false;

  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 16;
}

export function formatPhone(value, fallback = 'Sin numero') {
  if (!isRealPhone(value)) return fallback;
  return normalizePhoneCandidate(value);
}

export function formatLeadPhone(lead) {
  return getLeadPhoneDisplay(lead).value;
}

export function getLeadPhoneDisplay(lead = {}) {
  const data = lead || {};
  const phone = stringValue(data.phone);
  if (phone && isRealPhone(phone) && !matchesInternalWhatsappId(phone, data)) {
    return { value: formatPhone(phone), kind: 'phone', helper: '' };
  }

  const displayPhone = stringValue(data.display_phone || data.lead_display_phone);
  if (displayPhone) {
    if (endsWithIgnoreCase(displayPhone, WHATSAPP_LID_SUFFIX)) {
      return { value: `ID WhatsApp: ${stripWhatsappSuffix(displayPhone)}`, kind: 'whatsapp_id', helper: 'WhatsApp ID' };
    }
    if (endsWithIgnoreCase(displayPhone, WHATSAPP_NET_SUFFIX) && isRealPhone(stripWhatsappSuffix(displayPhone))) {
      return { value: formatPhone(stripWhatsappSuffix(displayPhone)), kind: 'phone', helper: '' };
    }

    return {
      value: displayPhone,
      kind: isRealPhone(displayPhone) ? 'phone' : 'whatsapp_id',
      helper: isRealPhone(displayPhone) ? '' : 'WhatsApp ID'
    };
  }

  const lid = stringValue(data.whatsapp_lid || data.lead_whatsapp_lid);
  if (lid) {
    return { value: `ID WhatsApp: ${stripWhatsappSuffix(lid)}`, kind: 'whatsapp_id', helper: 'WhatsApp ID' };
  }

  const whatsappId = stringValue(data.whatsapp_id || data.lead_whatsapp_id);
  if (endsWithIgnoreCase(whatsappId, WHATSAPP_LID_SUFFIX)) {
    return { value: `ID WhatsApp: ${stripWhatsappSuffix(whatsappId)}`, kind: 'whatsapp_id', helper: 'WhatsApp ID' };
  }

  if (endsWithIgnoreCase(whatsappId, WHATSAPP_NET_SUFFIX)) {
    const phoneFromWhatsapp = stripWhatsappSuffix(whatsappId);
    if (isRealPhone(phoneFromWhatsapp)) {
      return { value: formatPhone(phoneFromWhatsapp), kind: 'phone', helper: '' };
    }
  }

  return { value: 'Sin numero', kind: 'empty', helper: '' };
}

export function stripWhatsappSuffix(value) {
  const text = stringValue(value);
  if (!text) return '';
  return text.replace(new RegExp(`${escapeRegExp(WHATSAPP_NET_SUFFIX)}$`, 'i'), '').replace(new RegExp(`${escapeRegExp(WHATSAPP_LID_SUFFIX)}$`, 'i'), '');
}

function normalizePhoneCandidate(value) {
  return String(value).trim().replace(/[\s().-]/g, '');
}

function stringValue(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function matchesInternalWhatsappId(value, lead) {
  const digits = normalizePhoneCandidate(value).replace(/^\+/, '');
  const internalIds = [
    lead.whatsapp_lid,
    lead.lead_whatsapp_lid,
    endsWithIgnoreCase(String(lead.whatsapp_id || ''), WHATSAPP_LID_SUFFIX) ? lead.whatsapp_id : '',
    endsWithIgnoreCase(String(lead.lead_whatsapp_id || ''), WHATSAPP_LID_SUFFIX) ? lead.lead_whatsapp_id : ''
  ]
    .map(stripWhatsappSuffix)
    .map((item) => normalizePhoneCandidate(item).replace(/^\+/, ''))
    .filter(Boolean);

  return internalIds.includes(digits);
}

function endsWithIgnoreCase(value, suffix) {
  return stringValue(value).toLowerCase().endsWith(suffix.toLowerCase());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
