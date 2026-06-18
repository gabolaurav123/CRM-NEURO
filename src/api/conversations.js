import { apiRequest, buildQuery } from './client';

export const conversationsApi = {
  list: (filters) => apiRequest(`/conversations${buildQuery(filters)}`),
  get: (leadId) => apiRequest(`/conversations/${leadId}`),
  sendMessage: (leadId, message) =>
    apiRequest(`/leads/${leadId}/send-message`, {
      method: 'POST',
      body: { message }
    })
};
