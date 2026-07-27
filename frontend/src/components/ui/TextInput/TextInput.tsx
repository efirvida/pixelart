import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './TextInput.module.css';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Text input with label and error message.
 *
 * On error: sets ``aria-invalid="true"`` and links the error message via
 * ``aria-describedby``. Forwards ref to the ``<input>`` element.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const errorId = id ? `${id}-error` : undefined;
    const describedBy = error && errorId ? errorId : undefined;

    const inputClasses = [styles.input, error ? styles.inputError : '']
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`${styles.wrapper} ${className}`} data-testid="textinput-wrapper">
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          {...rest}
        />
        {error && (
          <span id={errorId} className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);

TextInput.displayName = 'TextInput';
