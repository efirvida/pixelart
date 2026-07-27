import type { ReactNode } from 'react';
import styles from './Section.module.css';

export interface SectionProps {
  /** Optional section heading. */
  title?: string;
  /** Section content. */
  children: ReactNode;
  /** Variant: default wraps in a section, card wraps in Card. @default "default" */
  variant?: 'default' | 'card';
  /** Additional class name for the outer element. */
  className?: string;
}

/**
 * Content section with an optional title heading.
 */
export function Section({ title, children, variant = 'default', className = '' }: SectionProps) {
  const classNames = [styles.section, className].filter(Boolean).join(' ');

  if (variant === 'card') {
    return (
      <section className={classNames}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {children}
      </section>
    );
  }

  return (
    <section className={classNames}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  );
}
