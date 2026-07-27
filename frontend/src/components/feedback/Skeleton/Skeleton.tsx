import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** CSS width value (e.g. "200px", "100%"). */
  width?: string;
  /** CSS height value. Ignored for "text" variant. */
  height?: string;
  /** Shape variant. @default "rect" */
  variant?: 'text' | 'circle' | 'rect';
  /** For text variant: how many lines to render. @default 1 */
  count?: number;
}

/**
 * Skeleton loading placeholder with pulsing animation.
 *
 * Variants:
 * - ``rect``: generic rectangle (default)
 * - ``text``: one or more lines of text skeleton
 * - ``circle``: round avatar/image placeholder
 */
export function Skeleton({ width, height, variant = 'rect', count = 1 }: SkeletonProps) {
  if (variant === 'text') {
    return (
      <div aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={styles.textLine}
            style={width ? { width } : undefined}
            data-testid="skeleton-line"
          />
        ))}
      </div>
    );
  }

  const classNames = [styles.skeleton, variant === 'circle' ? styles.circle : '']
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classNames}
      style={{ width: width || '100%', height: height || '20px' }}
      aria-hidden="true"
    />
  );
}
