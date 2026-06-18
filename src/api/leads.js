import { apiRequest, buildQuery } from './client';

export const leadsApi = {
  list: (filters) => apiRequest(`/leads${buildQuery(filters)}`),
  get: (id) => apiRequest(`/leads/${id}`),
  update: (id, body) => apiRequest(`/leads/${id}`, { method: 'PATCH', body }),
  pauseBot: (id) => apiRequest(`/leads/${id}/pause-bot`, { method: 'POST' }),
  resumeBot: (id) => apiRequest(`/leads/${id}/resume-bot`, { method: 'POST' }),
  takeover: (id) => apiRequest(`/leads/${id}/takeover`, { method: 'POST' }),
  releaseTakeover: (id) => apiRequest(`/leads/${id}/release-takeover`, { method: 'POST' }),
  deleteMemory: (id) => apiRequest(`/leads/${id}/delete-memory`, { method: 'POST' }),
  markPaid: (id) => apiRequest(`/leads/${id}/mark-paid`, { method: 'POST' }),
  sendHotmartLink: (id) => apiRequest(`/leads/${id}/send-hotmart-link`, { method: 'POST' })
};
