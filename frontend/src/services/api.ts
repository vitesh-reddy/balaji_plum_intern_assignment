import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Claims API
export const claimsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/claims', { params }),

  getById: (id: string) =>
    api.get(`/claims/${id}`),

  getStats: () =>
    api.get('/claims/stats'),

  submit: (formData: FormData) =>
    api.post('/claims', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),

  submitJSON: (data: Record<string, unknown>) =>
    api.post('/claims', data),

  appeal: (id: string, reason: string) =>
    api.post(`/claims/${id}/appeal`, { reason }),

  delete: (id: string) =>
    api.delete(`/claims/${id}`),
};

// Members API
export const membersAPI = {
  getAll: () =>
    api.get('/members'),

  getById: (id: string) =>
    api.get(`/members/${id}`),

  lookup: (id: string) =>
    api.get(`/members/${id}/lookup`),

  create: (data: Record<string, unknown>) =>
    api.post('/members', data),
};

// Policy API
export const policyAPI = {
  getTerms: () =>
    api.get('/policy'),

  getCoverage: () =>
    api.get('/policy/coverage'),

  getExclusions: () =>
    api.get('/policy/exclusions'),

  getNetworkHospitals: () =>
    api.get('/policy/network-hospitals'),
};

// Health check
export const healthCheck = () =>
  api.get('/health');

export default api;
