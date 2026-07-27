import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProvider } from '../test/renderWithProvider';
import { useGrid } from '../context/GridContext';
import { useToast } from '../components/feedback/Toast/ToastProvider';

/**
 * Component that consumes BOTH contexts — proves both providers
 * are wired correctly by renderWithProvider.
 */
function DoubleConsumer() {
  const { grid } = useGrid();
  const toast = useToast();
  return (
    <div>
      <span data-testid="grid-length">{grid.length}</span>
      <span data-testid="toast-type">{typeof toast.success}</span>
    </div>
  );
}

describe('renderWithProvider', () => {
  it('wraps children with both GridProvider and ToastProvider', () => {
    renderWithProvider(<DoubleConsumer />);
    expect(screen.getByTestId('grid-length')).toHaveTextContent('0');
    expect(screen.getByTestId('toast-type')).toHaveTextContent('function');
  });

  it('does not leak providers — plain render has no context', () => {
    // Rendering DoubleConsumer without renderWithProvider should throw
    expect(() => render(<DoubleConsumer />)).toThrow();
  });
});
