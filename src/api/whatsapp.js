import { apiRequest } from './client';

export const whatsappApi = {
  status: () => apiRequest('/whatsapp/status'),
  qr: () => apiRequest('/whatsapp/qr'),
  generateQr: () => apiRequest('/whatsapp/generate-qr', { method: 'POST' }),
  restart: () => apiRequest('/whatsapp/restart', { method: 'POST' }),
  logout: () => apiRequest('/whatsapp/logout', { method: 'POST' })
};
