import React from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  X
} from 'lucide-react';

export default function NotificationToast() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--accent-qa)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--status-critical)" />;
      case 'verified':
        return <Sparkles size={18} color="#10b981" />;
      default:
        return <Info size={18} color="var(--accent-dev)" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            {getToastIcon(toast.type)}
          </div>
          <div style={{ flex: 1 }}>
            {toast.title && (
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '2px' }}>
                {toast.title}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {toast.message}
            </div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
