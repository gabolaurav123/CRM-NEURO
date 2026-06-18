import { apiRequest } from './client';

export const settingsApi = {
  get: () => apiRequest('/settings'),
  update: (settings) => apiRequest('/settings', { method: 'PATCH', body: { settings } })
};
