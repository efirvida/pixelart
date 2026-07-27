import { forwardRef, useEffect, useRef, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode, KeyboardEvent, MouseEvent } from 'react';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Accessible modal dialog rendered via React Portal.
 *
 * - Escape key closes the modal.
 * - Clicking the overlay backdrop closes the modal.
 * - Focus returns to the previously focused element on close.
 * - Tab key cycles focus within the modal content (focus trap).
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, children, footer, className = '' }, ref) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const titleId = useId();

    // Combined ref: external + internal
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        (dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    // Save and restore focus
    useEffect(() => {
      if (open) {
        previousFocusRef.current = document.activeElement as HTMLElement;
        // Focus the dialog after render
        requestAnimationFrame(() => {
          dialogRef.current?.focus();
        });
      } else if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }, [open]);

    // Escape key handler
    useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Focus trap: Tab cycles within modal
    const handleTabTrap = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Overlay click → close
    const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    if (!open) return null;

    return createPortal(
      <div
        className={styles.overlay}
        data-testid="modal-overlay"
        onClick={handleOverlayClick}
        onKeyDown={handleTabTrap}
      >
        <div
          ref={setRefs}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`${styles.dialog} ${className}`}
          tabIndex={-1}
        >
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </div>,
      document.body,
    );
  },
);

Modal.displayName = 'Modal';
