import { apiRequest, buildQuery } from './client';

export const conversationsApi = {
  list: (filters) => apiRequest(`/conversations${buildQuery(filters)}`),
  get: (leadId) => apiRequest(`/conversations/${leadId}`),
  sendMessage: (leadId, message) =>
    apiRequest(`/conversations/${leadId}/send-message`, {
      method: 'POST',
      body: { message }
    })
};
