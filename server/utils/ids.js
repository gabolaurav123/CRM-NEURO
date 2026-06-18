export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

export function requireUuid(value, label = 'lead id') {
  const id = String(value || '').trim();
  if (!isUuid(id)) {
    const error = new Error(`Invalid ${label}`);
    error.status = 400;
    throw error;
  }
  return id;
}
