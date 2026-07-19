export const LEAD_STATUSES = ['frio', 'tibio', 'caliente', 'comprador', 'perdido'];

export const PAYMENT_STATUSES = ['pendiente', 'pending', 'reported', 'reportado', 'pagado', 'confirmed', 'failed', 'cancelled'];

export const FUNNEL_STAGES = [
  'inicio',
  'captacion',
  'diagnostico',
  'datos_solicitados',
  'oferta_presentada',
  'objecion',
  'link_pago_enviado',
  'pago_reportado',
  'onboarding',
  'pausado',
  'humano',
  'crisis'
];

export const WHATSAPP_STATUSES = ['connected', 'disconnected', 'qr_pending', 'initializing'];

export const SETTING_FIELDS = [
  { key: 'product_name', label: 'Nombre principal del CRM', type: 'text' },
  { key: 'neurotrauma_price', label: 'Precio Neurotrauma', type: 'number' },
  { key: 'neurotrauma_hotmart_link', label: 'Link Neurotrauma', type: 'url' },
  { key: 'holograficas_price', label: 'Precio Holograficas', type: 'number' },
  { key: 'holograficas_hotmart_link', label: 'Link Holograficas', type: 'url' },
  { key: 'gemini_model', label: 'Modelo de Gemini', type: 'text' },
  { key: 'gemini_temperature', label: 'Temperatura de Gemini', type: 'number', step: '0.1' },
  { key: 'gemini_max_output_tokens', label: 'Maximo de tokens', type: 'number' },
  { key: 'memory_expiration_hours', label: 'Horas de memoria', type: 'number' },
  { key: 'followup_1_hours', label: 'Follow-up 1 (horas)', type: 'number' },
  { key: 'followup_payment_1_hours', label: 'Pago follow-up 1 (horas)', type: 'number' },
  { key: 'followup_payment_2_hours', label: 'Pago follow-up 2 (horas)', type: 'number' },
  { key: 'followup_payment_3_hours', label: 'Pago follow-up 3 (horas)', type: 'number' },
  { key: 'followup_4_days', label: 'Follow-up 4 (dias)', type: 'number' },
  { key: 'followup_payment_1_message', label: 'Mensaje follow-up 6 horas', type: 'textarea' },
  { key: 'followup_payment_2_message', label: 'Mensaje follow-up 24 horas', type: 'textarea' },
  { key: 'followup_payment_3_message', label: 'Mensaje follow-up 48 horas', type: 'textarea' },
  { key: 'followup_4_message', label: 'Mensaje follow-up 7 dias', type: 'textarea' },
  { key: 'bot_enabled', label: 'Bot global activo', type: 'select', options: ['true', 'false'] },
  { key: 'initial_message', label: 'Mensaje inicial', type: 'textarea' },
  { key: 'memory_notice_message', label: 'Aviso memoria 24h', type: 'textarea' },
  { key: 'offer_text', label: 'Texto de oferta', type: 'textarea' },
  { key: 'payment_link_text', label: 'Texto de link de pago', type: 'textarea' }
];
