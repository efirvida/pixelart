import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary/ErrorBoundary';

/**
 * Component that throws during render — used to trigger the boundary.
 */
function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test explosion');
  }
  return <p>All good</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <p>Normal child</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Normal child')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('An unexpected error occurred. Please try again.'),
    ).toBeInTheDocument();
  });

  it('displays a "Try Again" button that calls onReset', async () => {
    const onReset = vi.fn();

    render(
      <ErrorBoundary onReset={onReset}>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Fallback is visible.
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click "Try Again" — should call onReset.
    const tryAgainBtn = screen.getByRole('button', { name: 'Try Again' });
    await userEvent.click(tryAgainBtn);

    expect(onReset).toHaveBeenCalledOnce();
  });

  it('recovers after error is resolved via key remount', async () => {
    // Render with throwing child first.
    const { rerender } = render(
      <ErrorBoundary key="broken">
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Remount with a new key and a non-throwing child.
    rerender(
      <ErrorBoundary key="fixed">
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByText('All good')).toBeInTheDocument();
    });
  });

  it('logs caught errors via console.error', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalled();
  });

  it('accepts custom fallback title and message', () => {
    render(
      <ErrorBoundary fallbackTitle="Custom Error" fallbackMessage="Custom message text.">
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Custom message text.')).toBeInTheDocument();
  });
});
