import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Store for active abort controllers
const abortControllers = new Map();

// Helper to create request with cancellation
const makeRequest = async (key, requestFn) => {
  // Cancel previous request if it exists
  if (abortControllers.has(key)) {
    abortControllers.get(key).abort();
  }

  const controller = new AbortController();
  abortControllers.set(key, controller);

  try {
    const result = await requestFn(controller.signal);
    abortControllers.delete(key);
    return result;
  } catch (error) {
    abortControllers.delete(key);
    throw error;
  }
};

// Cancel all ongoing requests (useful on unmount or app exit)
export const cancelAllRequests = () => {
  abortControllers.forEach(controller => controller.abort());
  abortControllers.clear();
};

// ── Statements ────────────────────────────────
export const uploadStatement = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const controller = new AbortController();
  return api.post('/statements/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal: controller.signal,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
};

export const getStatements = (signal) => 
  api.get('/statements', { signal });

export const getStatement = (id, signal) => 
  api.get(`/statements/${id}`, { signal });

export const deleteStatement = (id) => 
  api.delete(`/statements/${id}`);

// ── Transactions ──────────────────────────────
export const getTransactions = (params, signal) => 
  api.get('/transactions', { params, signal });

// ── Analytics ─────────────────────────────────
export const getAnalyticsSummary = (id, signal) => 
  api.get(`/analytics/summary/${id}`, { signal });

export const getCategories = (id, signal) => 
  api.get(`/analytics/categories/${id}`, { signal });

export const getTrend = (signal) => 
  api.get('/analytics/trend', { signal });

export const getCompare = (id1, id2, signal) => 
  api.get('/analytics/compare', { params: { ids: `${id1},${id2}` }, signal });

// ── Insights ──────────────────────────────────
export const getInsights = (id, signal) => 
  api.get(`/insights/${id}`, { signal });

export const generateInsights = (id) => 
  api.post(`/insights/generate/${id}`);

export default api;

