import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor to unwrap data
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

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

export const getStatements = (signal) => {
  const s = signal?.signal || signal;
  return api.get('/statements', { signal: s });
};

export const getStatement = (id, signal) => {
  const s = signal?.signal || signal;
  return api.get(`/statements/${id}`, { signal: s });
};

export const deleteStatement = (id) => 
  api.delete(`/statements/${id}`);

// ── Transactions ──────────────────────────────
export const getTransactions = (params, signal) => {
  const s = signal?.signal || signal;
  return api.get('/transactions', { params, signal: s });
};

// ── Analytics ─────────────────────────────────
export const getAnalyticsSummary = (id, signal) => {
  const s = signal?.signal || signal;
  return api.get(`/analytics/summary/${id}`, { signal: s });
};

export const getCategories = (id, signal) => {
  const s = signal?.signal || signal;
  return api.get(`/analytics/categories/${id}`, { signal: s });
};

export const getTrend = (signal) => {
  const s = signal?.signal || signal;
  return api.get('/analytics/trend', { signal: s });
};

export const getCompare = (id1, id2, signal) => {
  const s = signal?.signal || signal;
  return api.get('/analytics/compare', { params: { ids: `${id1},${id2}` }, signal: s });
};

// ── Insights ──────────────────────────────────
export const getInsights = (id, signal) => {
  const s = signal?.signal || signal;
  return api.get(`/insights/${id}`, { signal: s });
};

export const generateInsights = (id) => 
  api.post(`/insights/generate/${id}`);

// ── Aliases ───────────────────────────────────
export const fetchStatements = getStatements;
export const fetchTransactions = getTransactions;
export const fetchDashboardSummary = getAnalyticsSummary;
export const fetchCategoryBreakdown = getCategories;
export const fetchMonthlyTrends = getTrend;
export const fetchCategoryComparison = getCompare;
export const fetchInsights = getInsights;

export default api;
