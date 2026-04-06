import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ── Statements ────────────────────────────────
export const uploadStatement = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/statements/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
};

export const getStatements = () => api.get('/statements');
export const getStatement = (id) => api.get(`/statements/${id}`);
export const deleteStatement = (id) => api.delete(`/statements/${id}`);

// ── Transactions ──────────────────────────────
export const getTransactions = (params) => api.get('/transactions', { params });

// ── Analytics ─────────────────────────────────
export const getAnalyticsSummary = (id) => api.get(`/analytics/summary/${id}`);
export const getCategories = (id) => api.get(`/analytics/categories/${id}`);
export const getTrend = (bankName) => api.get('/analytics/trend', { params: bankName ? { bank_name: bankName } : {} });
export const getCompare = (id1, id2) => api.get('/analytics/compare', { params: { ids: `${id1},${id2}` } });

// ── Insights ──────────────────────────────────
export const getInsights = (id) => api.get(`/insights/${id}`);
export const generateInsights = (id) => api.post(`/insights/generate/${id}`);

export default api;
