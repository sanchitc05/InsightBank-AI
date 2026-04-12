import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ScrollProgress from './components/ScrollProgress';
import ToastProvider from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/Toast';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const Insights = lazy(() => import('./pages/Insights'));
const Compare = lazy(() => import('./pages/Compare'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
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
      <AuthProvider>
        <ToastProvider>
          <QueryClientBridge>
            <BrowserRouter>
              <ScrollProgress />
              <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
              </div>
              <Navbar />
              <ToastContainer />
              <main className="flex-1 flex flex-col">
                <Suspense fallback={<SuspenseFallback />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                    <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
                    <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
                    <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
                    
                    {/* Catch All */}
                    <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
                  </Routes>
                </Suspense>
              </main>
            </BrowserRouter>
          </QueryClientBridge>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
