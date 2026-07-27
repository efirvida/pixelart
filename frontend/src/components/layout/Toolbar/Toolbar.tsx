import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

export interface ToolbarProps {
  /** Toolbar actions / children. */
  children: ReactNode;
  /** Horizontal alignment. @default "start" */
  align?: 'start' | 'center' | 'end' | 'space-between';
  /** Whether items should wrap to next line. @default true */
  wrap?: boolean;
}

/**
 * Horizontal action toolbar with configurable alignment and wrapping.
 * On viewports < 768px, labels collapse — only icons remain visible.
 */
export function Toolbar({ children, align = 'start', wrap = true }: ToolbarProps) {
  const classNames = [
    styles.toolbar,
    styles[align],
    wrap ? styles.wrap : styles.nowrap,
  ].join(' ');

  return (
    <div className={classNames} role="toolbar">
      {children}
    </div>
  );
}
