import { forwardRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import styles from './RangeSlider.module.css';

export interface RangeSliderProps {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Range slider built on native ``<input type="range">``, styled with tokens.
 *
 * ARIA: the native input is the slider. Proper labeling via ``aria-labelledby``
 * pointing to the visible label. Forwards ref to the ``<input>``.
 *
 * Unlike the previous version based on InputHTMLAttributes, onChange here
 * receives the **parsed number value** directly, not a ChangeEvent.
 */
export const RangeSlider = forwardRef<HTMLInputElement, RangeSliderProps>(
  ({ label, min = 0, max = 100, step = 1, value = 50, onChange, className = '', id, disabled }, ref) => {
    const labelId = id || `rs-label-${label.replace(/\s+/g, '-').toLowerCase()}`;

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        onChange?.(Number(e.currentTarget.value));
      },
      [onChange],
    );

    return (
      <div className={`${styles.wrapper} ${className}`} data-testid="rangeslider-wrapper">
        <label id={labelId} className={styles.label}>
          {label}
        </label>
        <input
          ref={ref}
          type="range"
          className={styles.slider}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-valuemin={Number(min)}
          aria-valuemax={Number(max)}
          aria-valuenow={Number(value)}
          onChange={handleChange}
        />
      </div>
    );
  },
);

RangeSlider.displayName = 'RangeSlider';
