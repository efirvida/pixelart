import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { GridProvider } from '../context/GridContext';
import { ToastProvider } from '../components/feedback/Toast/ToastProvider';

/**
 * Wrap a component in ``GridProvider`` and ``ToastProvider`` so it can access
 * ``useGrid()`` and ``useToast()`` during tests.
 */
export function renderWithProvider(ui: ReactElement) {
  return render(
    <ToastProvider>
      <GridProvider>{ui}</GridProvider>
    </ToastProvider>,
  );
}
