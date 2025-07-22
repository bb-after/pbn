import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertProps, Slide, SlideProps } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Warning, Info } from '@mui/icons-material';
import { tokens } from '../../theme/intercom-theme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ReactNode;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = {
        id,
        duration: 5000,
        ...toast,
      };

      setToasts(prev => [...prev, newToast]);

      // Auto-hide after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, newToast.duration);
      }
    },
    [hideToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'success', title, message });
    },
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'error', title, message });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'warning', title, message });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'info', title, message });
    },
    [showToast]
  );

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 20 }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 20 }} />;
      case 'info':
        return <Info sx={{ fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: tokens.colors.success[50],
          color: tokens.colors.success[800],
          borderColor: tokens.colors.success[200],
          iconColor: tokens.colors.success[600],
        };
      case 'error':
        return {
          backgroundColor: tokens.colors.error[50],
          color: tokens.colors.error[800],
          borderColor: tokens.colors.error[200],
          iconColor: tokens.colors.error[600],
        };
      case 'warning':
        return {
          backgroundColor: tokens.colors.warning[50],
          color: tokens.colors.warning[800],
          borderColor: tokens.colors.warning[200],
          iconColor: tokens.colors.warning[600],
        };
      case 'info':
        return {
          backgroundColor: tokens.colors.primary[50],
          color: tokens.colors.primary[800],
          borderColor: tokens.colors.primary[200],
          iconColor: tokens.colors.primary[600],
        };
      default:
        return {
          backgroundColor: tokens.colors.grey[50],
          color: tokens.colors.grey[800],
          borderColor: tokens.colors.grey[200],
          iconColor: tokens.colors.grey[600],
        };
    }
  };

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showWarning, showInfo, hideToast }}
    >
      {children}
      {toasts.map(toast => {
        const colors = getToastColors(toast.type);
        const icon = getToastIcon(toast.type);

        return (
          <Snackbar
            key={toast.id}
            open={true}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            TransitionComponent={SlideTransition}
            sx={{
              '& .MuiSnackbar-root': {
                position: 'static',
              },
            }}
          >
            <Alert
              severity={toast.type}
              onClose={() => hideToast(toast.id)}
              icon={icon}
              action={toast.action}
              sx={{
                backgroundColor: colors.backgroundColor,
                color: colors.color,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: tokens.borderRadius.md,
                boxShadow: tokens.shadows[4],
                minWidth: 320,
                maxWidth: 480,
                // marginTop: 0.75,
                '& .MuiAlert-icon': {
                  color: colors.iconColor,
                },
                '& .MuiAlert-message': {
                  // padding: 0,
                  // marginTop: 0.75,
                },
                '& .MuiAlert-action': {
                  // padding: 0,
                  // marginTop: 0.75,
                  marginRight: 0,
                },
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: toast.message ? 4 : 0,
                  }}
                >
                  {toast.title}
                </div>
                {toast.message && (
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      opacity: 0.9,
                      lineHeight: 1,
                    }}
                  >
                    {toast.message}
                  </div>
                )}
              </div>
            </Alert>
          </Snackbar>
        );
      })}
    </ToastContext.Provider>
  );
};

// Pre-configured toast hooks for common use cases
export const useIntercomToast = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  return {
    success: (title: string, message?: string) => showSuccess(title, message),
    error: (title: string, message?: string) => showError(title, message),
    warning: (title: string, message?: string) => showWarning(title, message),
    info: (title: string, message?: string) => showInfo(title, message),
  };
};
