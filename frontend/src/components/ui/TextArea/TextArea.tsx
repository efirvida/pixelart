import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import styles from './TextArea.module.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

/**
 * Multi-line text area with label and error message.
 *
 * On error: sets ``aria-invalid="true"`` and links the error message via
 * ``aria-describedby``. Forwards ref to the ``<textarea>`` element.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const errorId = id ? `${id}-error` : undefined;
    const describedBy = error && errorId ? errorId : undefined;

    const textareaClasses = [styles.textarea, error ? styles.textareaError : '']
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`${styles.wrapper} ${className}`} data-testid="textarea-wrapper">
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={id}
          className={textareaClasses}
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

TextArea.displayName = 'TextArea';
