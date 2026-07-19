export const PRODUCT_OPTIONS = [
  { value: 'neurotrauma', label: 'Neurotrauma', shortLabel: 'Neurotrauma' },
  { value: 'holograficas', label: 'Holográficas', shortLabel: 'Holográficas' },
  { value: 'ambos', label: 'Ambos productos', shortLabel: 'Ambos' },
  { value: 'sin_definir', label: 'Sin definir', shortLabel: 'Sin definir' }
];

export function getProductInterest(lead = {}) {
  const value = String(lead.product_interest || '').trim().toLowerCase();
  if (PRODUCT_OPTIONS.some((option) => option.value === value)) return value;
  const legacyCrmKey = lead.crm_key || lead.lead_crm_key;
  if (legacyCrmKey === 'neurotraumas') return 'neurotrauma';
  if (legacyCrmKey === 'holograficas') return 'holograficas';
  return 'sin_definir';
}

export function getProductLabel(value) {
  return PRODUCT_OPTIONS.find((option) => option.value === value)?.label || 'Sin definir';
}
