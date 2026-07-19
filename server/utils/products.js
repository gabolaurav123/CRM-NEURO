export const PRODUCT_INTERESTS = new Set(['neurotrauma', 'holograficas', 'ambos', 'sin_definir']);

export function normalizeProductInterest(value, fallbackCrmKey = '') {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    neurotraumas: 'neurotrauma',
    neuro: 'neurotrauma',
    holografica: 'holograficas',
    holographic: 'holograficas',
    ambos_productos: 'ambos',
    ambos: 'ambos',
    ninguno: 'sin_definir',
    desconocido: 'sin_definir'
  };
  const candidate = aliases[normalized] || normalized;
  if (PRODUCT_INTERESTS.has(candidate)) return candidate;

  const crmKey = String(fallbackCrmKey || '').trim().toLowerCase();
  if (crmKey === 'neurotraumas') return 'neurotrauma';
  if (crmKey === 'holograficas') return 'holograficas';
  return 'sin_definir';
}

export function crmKeyForProduct(productInterest, fallback = 'holograficas') {
  return normalizeProductInterest(productInterest) === 'neurotrauma' ? 'neurotraumas' : fallback;
}
