import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { GridProvider } from '../context/GridContext';

/**
 * Wrap a component in the ``GridProvider`` so it can access
 * ``useGrid()`` during tests.
 */
export function renderWithProvider(ui: ReactElement) {
  return render(<GridProvider>{ui}</GridProvider>);
}
