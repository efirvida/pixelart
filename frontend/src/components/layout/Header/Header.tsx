import type { ReactNode } from 'react';
import styles from './Header.module.css';

export interface HeaderProps {
  /** Main heading text. */
  title: string;
  /** Optional subtitle displayed below the title. */
  subtitle?: string;
  /** Action elements (buttons, etc.) on the right side. */
  children?: ReactNode;
}

/**
 * Application header / title bar.
 *
 * Uses ``--color-primary`` background with white text.
 * Renders as ``<header>`` landmark (role="banner").
 */
export function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}
