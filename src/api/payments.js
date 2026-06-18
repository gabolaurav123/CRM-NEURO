import { apiRequest, buildQuery } from './client';

export const paymentsApi = {
  list: (filters) => apiRequest(`/payments${buildQuery(filters)}`),
  update: (id, body) => apiRequest(`/payments/${id}`, { method: 'PATCH', body })
};
