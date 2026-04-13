import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ScrollProgress from './components/ScrollProgress';
import ToastProvider from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/Toast';
import Sidebar from './components/Sidebar';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const Insights = lazy(() => import('./pages/Insights'));
const Compare = lazy(() => import('./pages/Compare'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));

const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div
      className="animate-spin rounded-full h-8 w-8 border-t-2"
      style={{ borderColor: 'var(--color-primary)' }}
    />
  </div>
);

function QueryClientBridge({ children }) {
  const queryClient = useQueryClient();

  useEffect(() => {
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
              <Sidebar />
              <Navbar />
              <ToastContainer />
              <main className="flex-1 flex flex-col md:pl-64 min-h-screen">
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
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    
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
