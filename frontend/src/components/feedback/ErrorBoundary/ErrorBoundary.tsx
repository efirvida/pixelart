import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Card } from '../../ui/Card/Card';
import { Button } from '../../ui/Button/Button';
import styles from './ErrorBoundary.module.css';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback title. @default "Something went wrong" */
  fallbackTitle?: string;
  /** Custom fallback message. */
  fallbackMessage?: string;
  /** Called when the user clicks "Try Again". */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary that catches render errors in its subtree.
 *
 * Shows a fallback Card with an error message and a "Try Again" button.
 * Errors are logged via ``console.error`` in ``componentDidCatch``.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReset(): void {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card className={styles.container}>
          <h2 className={styles.title}>
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h2>
          <p className={styles.message}>
            {this.props.fallbackMessage ?? 'An unexpected error occurred. Please try again.'}
          </p>
          <Button onClick={this.handleReset} variant="primary">
            Try Again
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
