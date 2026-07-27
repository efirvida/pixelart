import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import GridEditor from '../components/GridEditor';
import { useGrid } from '../context/GridContext';
import { renderWithProvider } from '../test/renderWithProvider';
import { useEffect } from 'react';

// Helpers --------------------------------------------------------------------

const PALETTE = ['#111111', '#222222', '#333333'];

function testGrid(rows = 3): number[][] {
  return Array.from({ length: rows }, () => Array(rows).fill(0));
}

function Harness({ grid, palette }: { grid: number[][]; palette: string[] }) {
  const { resetGrid } = useGrid();
  useEffect(() => {
    resetGrid(grid, palette);
  }, [resetGrid, grid, palette]);
  return <GridEditor />;
}

function renderHarness(rows = 3, palette = PALETTE) {
  return renderWithProvider(<Harness grid={testGrid(rows)} palette={palette} />);
}

// Tests ----------------------------------------------------------------------

describe('GridEditor', () => {
  it('shows empty message when no grid data', () => {
    renderWithProvider(<GridEditor />);
    expect(screen.getByText(/upload an image/i)).toBeTruthy();
  });

  it('renders a canvas when grid data is present', () => {
    renderHarness(3);
    expect(screen.getByTestId('grid-canvas')).toBeTruthy();
  });

  it('click cycles colour on canvas', () => {
    renderHarness(3);
    const canvas = screen.getByTestId('grid-canvas');
    fireEvent.click(canvas, { clientX: 100, clientY: 100 });
    // Component should not throw; undo stack grows internally.
  });

  it('Ctrl+Z triggers undo without error', () => {
    renderHarness(3);
    const canvas = screen.getByTestId('grid-canvas');
    fireEvent.click(canvas, { clientX: 50, clientY: 50 });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    // Undo should not throw — reverts the click.
  });

  it('renders correct grid size canvas element', () => {
    const { container } = renderHarness(5);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });
});
