import type { ReactNode } from 'react';
import styles from './PageLayout.module.css';

export interface PageLayoutProps {
  /** Header element (e.g. <Header />). */
  header?: ReactNode;
  /** Main content area. */
  children: ReactNode;
  /** Footer element (e.g. <Footer />). */
  footer?: ReactNode;
  /** Max width for the content area. @default "1200px" */
  maxWidth?: string;
}

/**
 * Responsive page shell using CSS Flexbox / Grid.
 *
 * Mobile: single-column stack.
 * Desktop (≥768px): header + content + footer in a grid layout.
 */
export function PageLayout({ header, children, footer, maxWidth = '1200px' }: PageLayoutProps) {
  return (
    <div className={styles.layout}>
      {header}
      <main
        className={styles.content}
        style={{ ['--max-width' as string]: maxWidth } as React.CSSProperties}
      >
        {children}
      </main>
      {footer}
    </div>
  );
}
