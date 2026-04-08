import { useContext, useEffect } from 'react';
import { ToastContext } from '../context/ToastContext';

export default function ToastContainer() {
  const { toasts, dismissToast } = useContext(ToastContext) || { toasts: [], dismissToast: () => {} };

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function Toast({ message, type, id, onDismiss }) {
  useEffect(() => {
    const duration = type === 'error' ? 5000 : 3000;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, type, onDismiss]);

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', icon: '✓' },
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '✗' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: 'ℹ' },
  };

  const color = colors[type] || colors.info;

  return (
    <div
      style={{
        animation: 'slideIn 0.3s ease-out forwards',
      }}
    >
      <div
        className="px-4 py-3 rounded-lg border-l-4 flex items-center gap-3"
        style={{
          background: color.bg,
          borderColor: color.border,
        }}
      >
        <span style={{ color: color.border, fontWeight: 'bold' }}>{color.icon}</span>
        <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{message}</span>
      </div>
    </div>
  );
}
