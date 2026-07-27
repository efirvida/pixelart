import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for accessibility — describes the button's action. */
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Icon-only button.
 *
 * Requires ``aria-label`` for accessibility.
 * Forwards ref to the underlying ``<button>`` element.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'primary', size = 'md', disabled, className = '', children, ...rest }, ref) => {
    const classNames = [
      styles.base,
      styles[variant],
      styles[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classNames} disabled={disabled} {...rest}>
        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
