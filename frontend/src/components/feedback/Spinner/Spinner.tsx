import styles from './Spinner.module.css';

export interface SpinnerProps {
  /** Spinner size. @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Custom color (overrides --color-primary). Applied as --spinner-color. */
  color?: string;
  /** Accessible label. @default "Loading" */
  label?: string;
}

/**
 * CSS-only loading spinner with ARIA live region.
 */
export function Spinner({ size = 'md', color, label = 'Loading' }: SpinnerProps) {
  const style = color ? { ['--spinner-color' as string]: color } as React.CSSProperties : undefined;

  return (
    <span
      className={`${styles.spinner} ${styles[size]}`}
      role="status"
      aria-label={label}
      style={style}
    />
  );
}
