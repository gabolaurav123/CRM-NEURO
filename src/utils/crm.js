export const CRM_OPTIONS = [
  {
    key: 'neurotraumas',
    name: 'Neurotraumas',
    title: 'Operacion Neurotraumas',
    description: 'CRM actual de Neurotraumas y NTR.'
  },
  {
    key: 'holograficas',
    name: 'Holograficas',
    title: 'Operacion Holograficas',
    description: 'CRM separado para Holograficas usando el mismo chatbot y WhatsApp.'
  }
];

export const DEFAULT_CRM_KEY = 'neurotraumas';

export function normalizeCrmKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return CRM_OPTIONS.some((crm) => crm.key === key) ? key : DEFAULT_CRM_KEY;
}

export function getCrmByKey(value) {
  const key = normalizeCrmKey(value);
  return CRM_OPTIONS.find((crm) => crm.key === key) || CRM_OPTIONS[0];
}
