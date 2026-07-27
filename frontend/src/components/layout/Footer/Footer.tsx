import type { ReactNode } from 'react';
import styles from './Footer.module.css';

export interface FooterProps {
  /** Custom footer content. Falls back to default copyright. */
  children?: ReactNode;
}

/**
 * Simple application footer.
 *
 * Renders as ``<footer>`` landmark (role="contentinfo").
 * Defaults to "Pixel Art Editor © 2026" when no children are provided.
 */
export function Footer({ children }: FooterProps) {
  return (
    <footer className={styles.footer}>
      {children ?? 'Pixel Art Editor © 2026'}
    </footer>
  );
}
