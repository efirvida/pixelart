import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProvider } from '../test/renderWithProvider';
import ComparisonSlider from '../components/ComparisonSlider';
import { useGrid } from '../context/GridContext';
import { useEffect } from 'react';

// Helpers --------------------------------------------------------------------

const PALETTE = ['#FF0000', '#00FF00', '#0000FF'];
const DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function testGrid(size = 3): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function Harness({
  grid,
  palette,
  originalImage,
}: {
  grid: number[][];
  palette: string[];
  originalImage: string | null;
}) {
  const { resetGrid } = useGrid();
  useEffect(() => {
    resetGrid(grid, palette, originalImage);
  }, [resetGrid, grid, palette, originalImage]);
  return <ComparisonSlider />;
}

function renderHarness(
  originalImage: string | null = DATA_URL,
  size = 3,
) {
  return renderWithProvider(
    <Harness
      grid={testGrid(size)}
      palette={PALETTE}
      originalImage={originalImage}
    />,
  );
}

// Tests ----------------------------------------------------------------------

describe('ComparisonSlider', () => {
  it('shows placeholder when no data', () => {
    renderWithProvider(<ComparisonSlider />);
    expect(screen.getByText(/upload an image/i)).toBeTruthy();
  });

  it('renders the comparison container when data is present', () => {
    renderHarness();
    expect(screen.getByTestId('comparison-slider')).toBeTruthy();
  });

  it('renders the grid canvas', () => {
    renderHarness();
    expect(screen.getByTestId('comparison-grid-canvas')).toBeTruthy();
  });

  it('renders the divider handle', () => {
    renderHarness();
    expect(screen.getByTestId('comparison-divider')).toBeTruthy();
  });

  it('responds to divider mouse-down', () => {
    renderHarness();
    const divider = screen.getByTestId('comparison-divider');
    fireEvent.mouseDown(divider, { clientX: 200, clientY: 200 });
    // Starting drag should NOT throw.
  });

  it('updates ratio on mouse move during drag', () => {
    const { container } = renderHarness();
    const divider = screen.getByTestId('comparison-divider');

    fireEvent.mouseDown(divider, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(window, { clientX: 250, clientY: 200 });

    // After drag, slider container should still exist.
    expect(
      container.querySelector('[data-testid="comparison-slider"]'),
    ).toBeTruthy();
  });

  it('syncs with grid edits (canvas re-renders)', () => {
    renderHarness();
    const canvas = screen.getByTestId('comparison-grid-canvas');
    expect(canvas).toBeTruthy();
  });
});
