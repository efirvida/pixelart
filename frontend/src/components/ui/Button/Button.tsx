import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

/**
 * Reusable button primitive.
 *
 * Variants: primary (filled), secondary (outlined), ghost (transparent).
 * Supports loading state with a CSS spinner and disabled prevention.
 * Forwards ref to the underlying ``<button>`` element.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...rest }, ref) => {
    const isDisabled = disabled || loading;

    const classNames = [
      styles.base,
      styles[variant],
      styles[size],
      loading ? styles.loading : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        {...rest}
      >
        {loading && <span className={styles.spinner} />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
