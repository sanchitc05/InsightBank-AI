import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ToastProvider, { useToast } from './context/ToastContext';
import ToastContainer from './components/Toast';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const Insights = lazy(() => import('./pages/Insights'));
const Compare = lazy(() => import('./pages/Compare'));
const NotFound = lazy(() => import('./pages/NotFound'));

const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div
      className="animate-spin rounded-full h-8 w-8 border-t-2"
      style={{ borderColor: 'var(--accent-primary)' }}
    />
  </div>
);

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

function QueryClientBridge({ children }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    // Set default options for all queries
    queryClient.setDefaultOptions({
      queries: {
        retry: 1,
        staleTime: 60 * 1000,
      },
    });
  }, [queryClient]);

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <QueryClientBridge>
          <BrowserRouter>
            <Navbar />
            <ToastContainer />
            <main className="flex-1">
              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
          </BrowserRouter>
        </QueryClientBridge>
      </ToastProvider>
    </ErrorBoundary>
  );
}
