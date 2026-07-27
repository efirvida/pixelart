import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 'sm' | 'md' | 'lg';
  padding?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Card container with elevation shadow and padding.
 *
 * Forwards ref to the underlying ``<div>``.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 'md', padding = 'md', className = '', children, ...rest }, ref) => {
    const classNames = [
      styles.base,
      styles[elevation],
      styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...rest}>
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
