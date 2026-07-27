import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Toast } from './Toast';
import type { ToastItem } from './Toast';
import styles from './Toast.module.css';

const AUTO_DISMISS_MS = 4000;

export interface ToastAPI {
  /** Show a success toast. Returns the toast id. */
  success(message: string): string;
  /** Show an error toast. Returns the toast id. */
  error(message: string): string;
  /** Show an info toast. Returns the toast id. */
  info(message: string): string;
  /** Dismiss a toast by id. */
  dismiss(id: string): void;
}

const ToastContext = createContext<ToastAPI | null>(null);

/**
 * Hook to access the toast API from any component inside ``ToastProvider``.
 */
export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

let nextId = 0;
function generateId(): string {
  nextId += 1;
  return `toast-${nextId}-${Date.now()}`;
}

/**
 * Provides toast notification state and the ``useToast()`` hook.
 *
 * Renders a fixed container for active toasts.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastItem['type'], message: string): string => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, type, message }]);
      return id;
    },
    [],
  );

  const success = useCallback((message: string) => addToast('success', message), [addToast]);
  const error = useCallback((message: string) => addToast('error', message), [addToast]);
  const info = useCallback((message: string) => addToast('info', message), [addToast]);

  const api = useMemo<ToastAPI>(
    () => ({ success, error, info, dismiss }),
    [success, error, info, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 && (
        <div className={styles.container} aria-label="Notifications">
          {toasts.map((toast) => (
            <AutoDismissToast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/**
 * Internal wrapper that auto-dismisses a toast after ``AUTO_DISMISS_MS``.
 */
function AutoDismissToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return <Toast toast={toast} onDismiss={onDismiss} />;
}
