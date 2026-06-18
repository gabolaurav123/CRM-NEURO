export const LEAD_STATUSES = ['frio', 'tibio', 'caliente', 'comprador', 'perdido'];

export const PAYMENT_STATUSES = ['pendiente', 'pending', 'reported', 'reportado', 'pagado', 'confirmed', 'failed', 'cancelled'];

export const FUNNEL_STAGES = [
  'inicio',
  'captacion',
  'diagnostico',
  'landing_enviada',
  'video_visto',
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
  { key: 'product_name', label: 'Nombre del producto', type: 'text' },
  { key: 'product_price', label: 'Precio', type: 'number' },
  { key: 'hotmart_link', label: 'Link de Hotmart', type: 'url' },
  { key: 'landing_link', label: 'Link de landing/video', type: 'url' },
  { key: 'gemini_model', label: 'Modelo de Gemini', type: 'text' },
  { key: 'gemini_temperature', label: 'Temperatura de Gemini', type: 'number', step: '0.1' },
  { key: 'gemini_max_output_tokens', label: 'Maximo de tokens', type: 'number' },
  { key: 'memory_expiration_hours', label: 'Horas de memoria', type: 'number' },
  { key: 'followup_1_hours', label: 'Follow-up 1 (horas)', type: 'number' },
  { key: 'followup_payment_1_hours', label: 'Pago follow-up 1 (horas)', type: 'number' },
  { key: 'followup_payment_2_hours', label: 'Pago follow-up 2 (horas)', type: 'number' },
  { key: 'followup_payment_3_hours', label: 'Pago follow-up 3 (horas)', type: 'number' },
  { key: 'followup_4_days', label: 'Follow-up 4 (dias)', type: 'number' },
  { key: 'bot_enabled', label: 'Bot global activo', type: 'select', options: ['true', 'false'] },
  { key: 'initial_message', label: 'Mensaje inicial', type: 'textarea' },
  { key: 'memory_notice_message', label: 'Aviso memoria 24h', type: 'textarea' },
  { key: 'offer_text', label: 'Texto de oferta', type: 'textarea' },
  { key: 'payment_link_text', label: 'Texto de link de pago', type: 'textarea' }
];
