import { createContext, useState, useCallback, useRef, useEffect, useContext } from 'react';

export const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATION = 3000;
const ERROR_DURATION = 5000;
const DUPLICATE_CHECK_INTERVAL = 1000; // 1 second window to prevent duplicates

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const recentMessagesRef = useRef([]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
      recentMessagesRef.current = [];
    };
  }, []);

  // Check for duplicate messages within interval
  const isDuplicateRecent = useCallback((message) => {
    const now = Date.now();
    const recentMsg = recentMessagesRef.current.find(
      (item) => item.message === message && now - item.timestamp < DUPLICATE_CHECK_INTERVAL
    );
    
    if (recentMsg) {
      return true;
    }

    // Add to recent messages and clean up old ones
    recentMessagesRef.current.push({ message, timestamp: now });
    recentMessagesRef.current = recentMessagesRef.current.filter(
      (item) => now - item.timestamp < DUPLICATE_CHECK_INTERVAL
    );

    return false;
  }, []);

  const showToast = useCallback((message, type = 'info', duration = null) => {
    // Prevent duplicate toasts
    if (isDuplicateRecent(message)) {
      return () => {};
    }

    const id = Date.now() + Math.random();
    const toastDuration = duration || (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

    setToasts((prev) => {
      // Keep only the latest MAX_VISIBLE_TOASTS toasts
      const updated = [...prev, { id, message, type }];
      if (updated.length > MAX_VISIBLE_TOASTS) {
        // Remove oldest toast's timer
        const oldestToast = updated[0];
        const oldTimer = timersRef.current.get(oldestToast.id);
        if (oldTimer) {
          clearTimeout(oldTimer);
          timersRef.current.delete(oldestToast.id);
        }
        return updated.slice(-MAX_VISIBLE_TOASTS);
      }
      return updated;
    });

    // Auto-dismiss with proper cleanup
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, toastDuration);

    timersRef.current.set(id, timer);

    // Return cleanup function for manual dismissal
    return () => {
      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };
  }, [isDuplicateRecent]);

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

