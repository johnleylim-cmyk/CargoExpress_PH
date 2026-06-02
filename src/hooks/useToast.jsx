import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ── Context ─────────────────────────────────────────────────────────── */
const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

/* ── Provider ────────────────────────────────────────────────────────── */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => {
      const next = [...prev, { id, message, type, duration }];
      return next.length > 4 ? next.slice(-4) : next;
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((msg, dur)  => addToast(msg, 'success', dur), [addToast]);
  const error   = useCallback((msg, dur)  => addToast(msg, 'error',   dur ?? 5000), [addToast]);
  const warning = useCallback((msg, dur)  => addToast(msg, 'warning', dur), [addToast]);
  const info    = useCallback((msg, dur)  => addToast(msg, 'info',    dur), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/* ── Icons ───────────────────────────────────────────────────────────── */
const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const LABELS = {
  success: 'Success',
  error:   'Error',
  warning: 'Warning',
  info:    'Info',
};

/* ── Toast Container ─────────────────────────────────────────────────── */
const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(t => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            role="alert"
            aria-atomic="true"
          >
            <div className="toast-icon-wrap">
              <Icon size={16} />
            </div>
            <div className="toast-body">
              <span className="toast-type-label">{LABELS[t.type]}</span>
              <span className="toast-message">{t.message}</span>
            </div>
            <button
              onClick={() => onRemove(t.id)}
              className="toast-close"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
