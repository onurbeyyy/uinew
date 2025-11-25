'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Toast türleri
type ToastType = 'success' | 'error' | 'info' | 'cart';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  productImage?: string;
  productName?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showCartToast: (productName: string, productImage?: string, onViewCart?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Item Component
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <i className="fas fa-check-circle" />;
      case 'error':
        return <i className="fas fa-times-circle" />;
      case 'info':
        return <i className="fas fa-info-circle" />;
      case 'cart':
        return <i className="fas fa-shopping-cart" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'linear-gradient(135deg, #28a745, #20c997)';
      case 'error':
        return 'linear-gradient(135deg, #dc3545, #c82333)';
      case 'info':
        return 'linear-gradient(135deg, #007bff, #0056b3)';
      case 'cart':
        return 'linear-gradient(135deg, #28a745, #20c997)';
      default:
        return '#333';
    }
  };

  return (
    <div
      className="toast-item"
      style={{
        background: getBackgroundColor(),
        color: 'white',
        padding: toast.type === 'cart' ? '12px 16px' : '14px 20px',
        borderRadius: '12px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        animation: 'slideInUp 0.3s ease-out',
        maxWidth: '380px',
        width: '100%',
      }}
    >
      {/* Ürün resmi (cart toast için) */}
      {toast.type === 'cart' && toast.productImage && toast.productImage.length > 0 && (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#fff',
          }}
        >
          <img
            src={toast.productImage}
            alt={toast.productName || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* İkon (cart değilse) */}
      {toast.type !== 'cart' && (
        <span style={{ fontSize: '20px', flexShrink: 0 }}>{getIcon()}</span>
      )}

      {/* Mesaj */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.type === 'cart' && toast.productName && (
          <div
            style={{
              fontWeight: '600',
              fontSize: '14px',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {toast.productName}
          </div>
        )}
        <div
          style={{
            fontSize: toast.type === 'cart' ? '12px' : '14px',
            opacity: toast.type === 'cart' ? 0.9 : 1,
          }}
        >
          {toast.message}
        </div>
      </div>

      {/* Aksiyon butonu */}
      {toast.action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.action?.onClick();
            onRemove(toast.id);
          }}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          {toast.action.label}
        </button>
      )}

      {/* Kapatma butonu */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: 1,
        }}
      >
        <i className="fas fa-times" />
      </button>
    </div>
  );
};

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const showCartToast = useCallback(
    (productName: string, productImage?: string, onViewCart?: () => void) => {
      showToast({
        type: 'cart',
        message: 'Sepete eklendi',
        productName,
        productImage,
        action: onViewCart
          ? {
              label: 'Sepete Git',
              onClick: onViewCart,
            }
          : undefined,
      });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showCartToast }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100002,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto', width: '100%' }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* Animasyon CSS */}
      <style jsx global>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
