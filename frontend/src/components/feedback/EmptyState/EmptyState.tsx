import type { ReactNode } from 'react';
import { Card } from '../../ui/Card/Card';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Optional icon to display above the title. */
  icon?: ReactNode;
  /** Required heading text. */
  title: string;
  /** Descriptive message text. */
  message: string;
  /** Optional action element (e.g. a Button) rendered below the message. */
  action?: ReactNode;
}

/**
 * Centered placeholder for empty or no-data states.
 *
 * Uses ``Card`` internally for consistent elevation and padding.
 */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Card className={styles.container}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </Card>
  );
}
