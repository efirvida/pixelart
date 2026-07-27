import styles from './Toast.module.css';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

/**
 * Individual toast notification.
 *
 * Rendered by ``ToastProvider`` — consumers use the ``useToast()`` hook.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className={styles.message}>{toast.message}</span>
      <button
        className={styles.closeBtn}
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        type="button"
      >
        ×
      </button>
    </div>
  );
}
