import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: SelectOption[];
}

/**
 * Native select wrapper with label and custom chevron styling.
 *
 * Auto-generates an ``id`` via ``useId()`` when not provided externally.
 * Forwards ref to the underlying ``<select>`` element.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const resolvedId = id ?? generatedId;

    return (
      <div className={`${styles.wrapper} ${className}`} data-testid="select-wrapper">
        <label htmlFor={resolvedId} className={styles.label}>
          {label}
        </label>
        <select ref={ref} id={resolvedId} className={styles.select} {...rest}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);

Select.displayName = 'Select';
