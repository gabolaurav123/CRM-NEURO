import { apiRequest, buildQuery } from './client';

export const followupsApi = {
  list: (filters) => apiRequest(`/followups${buildQuery(filters)}`),
  update: (id, body) => apiRequest(`/followups/${id}`, { method: 'PATCH', body }),
  sendNow: (id) => apiRequest(`/followups/${id}/send-now`, { method: 'POST' })
};
