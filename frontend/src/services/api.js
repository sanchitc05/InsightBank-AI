import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required for httpOnly cookies
});

// Response interceptor for automated data unwrapping and 401 handling
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and it's not from a login or refresh attempt itself
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        // Attempt to refresh the session
        await axios.post(
          `${api.defaults.baseURL}/auth/refresh`, 
          {}, 
          { withCredentials: true }
        );
        // If success, retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, we must clear auth state (handled by AuthContext)
        console.error('Session expired, redirecting to login');
        // We can't easily redirect here without window.location or event bus
        // Better: trigger a rejection that the caller/context can handle
        return Promise.reject(refreshError);
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ── Authentication ────────────────────────────
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const logoutUser = () => api.post('/auth/logout');
export const refreshSession = () => api.post('/auth/refresh');
export const getMe = () => api.get('/auth/me'); // Optional health check / profile query

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
