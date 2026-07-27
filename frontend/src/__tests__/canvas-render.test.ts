import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeCellBounds,
  renderGridCells,
  renderHighlight,
  hitTestCell,
} from '../lib/canvas-render';

// ---- Mocks -------------------------------------------------------------------

function makeMockCtx() {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

// ---- computeCellBounds -------------------------------------------------------

describe('computeCellBounds', () => {
  it('computes cell dimensions for a square canvas', () => {
    const result = computeCellBounds(400, 400, 10, 10, 2);
    expect(result.cellW).toBeCloseTo(39.6, 1);
    expect(result.cellH).toBeCloseTo(39.6, 1);
  });

  it('computes cell dimensions for a rectangular canvas', () => {
    const result = computeCellBounds(800, 400, 8, 16, 2);
    expect(result.cellW).toBeCloseTo(49.75, 1);
    expect(result.cellH).toBeCloseTo(49.5, 1);
  });

  it('accounts for zero padding', () => {
    const result = computeCellBounds(200, 200, 5, 5, 0);
    expect(result.cellW).toBe(40);
    expect(result.cellH).toBe(40);
  });

  it('accounts for large padding', () => {
    const result = computeCellBounds(200, 200, 5, 5, 10);
    expect(result.cellW).toBe(36);
    expect(result.cellH).toBe(36);
  });
});

// ---- renderGridCells ---------------------------------------------------------

describe('renderGridCells', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeMockCtx();
  });

  it('draws background plus one rect per cell', () => {
    const grid = [
      [0, 1],
      [2, 0],
    ];
    const palette = ['#aaa', '#bbb', '#ccc'];

    renderGridCells(ctx, grid, palette, { cellW: 50, cellH: 50 }, 2);

    // Background + 4 cells = 5 fillRect calls
    expect(ctx.fillRect).toHaveBeenCalledTimes(5);
  });

  it('does nothing for an empty grid (zero rows)', () => {
    renderGridCells(ctx, [], ['#aaa'], { cellW: 50, cellH: 50 }, 2);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('does nothing for a grid with zero columns', () => {
    renderGridCells(ctx, [[]], ['#aaa'], { cellW: 50, cellH: 50 }, 2);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('wraps palette index when palette is shorter than index', () => {
    const grid = [[2]]; // index 2, but only 2 colours (0, 1)
    const palette = ['#f00', '#0f0'];

    renderGridCells(ctx, grid, palette, { cellW: 100, cellH: 100 }, 0);

    // Should still draw (no crash), using wrapped index
    expect(ctx.fillRect).toHaveBeenCalledTimes(2); // bg + 1 cell
  });
});

// ---- renderHighlight ---------------------------------------------------------

describe('renderHighlight', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeMockCtx();
  });

  it('draws a stroke rect for the target cell', () => {
    renderHighlight(ctx, { row: 1, col: 2 }, { cellW: 40, cellH: 40 }, 2);

    expect(ctx.strokeStyle).toBe('#fbbf24');
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.strokeRect).toHaveBeenCalledOnce();
  });

  it('accepts a custom highlight colour', () => {
    renderHighlight(
      ctx,
      { row: 0, col: 0 },
      { cellW: 40, cellH: 40 },
      2,
      '#ff0000',
    );

    expect(ctx.strokeStyle).toBe('#ff0000');
    expect(ctx.strokeRect).toHaveBeenCalledOnce();
  });

  it('positions the stroke rect using padding and cell bounds', () => {
    renderHighlight(ctx, { row: 3, col: 1 }, { cellW: 30, cellH: 20 }, 5);

    expect(ctx.strokeRect).toHaveBeenCalledWith(
      5 + 1 * 30, // padding + col * cellW
      5 + 3 * 20, // padding + row * cellH
      30,          // cellW
      20,          // cellH
    );
  });
});

// ---- hitTestCell -------------------------------------------------------------

describe('hitTestCell', () => {
  it('returns correct cell for center coordinates', () => {
    // 400x400 canvas, 10x10 grid, padding 2
    // cellW = cellH = 39.6
    // center of cell (2,3): x = 2 + 3*39.6 + 19.8 = ~140.6, y = 2 + 2*39.6 + 19.8 = ~101
    const cell = hitTestCell(140, 101, 10, 10, 400, 400, 2);
    expect(cell).toEqual({ row: 2, col: 3 });
  });

  it('returns correct cell for corner coordinates near origin', () => {
    const cell = hitTestCell(3, 3, 10, 10, 400, 400, 2);
    expect(cell).toEqual({ row: 0, col: 0 });
  });

  it('returns correct cell for bottom-right corner', () => {
    const cell = hitTestCell(397, 397, 10, 10, 400, 400, 2);
    expect(cell).toEqual({ row: 9, col: 9 });
  });

  it('returns null for negative x coordinate', () => {
    const cell = hitTestCell(-5, 50, 10, 10, 400, 400, 2);
    expect(cell).toBeNull();
  });

  it('returns null for negative y coordinate', () => {
    const cell = hitTestCell(50, -5, 10, 10, 400, 400, 2);
    expect(cell).toBeNull();
  });

  it('returns null for x beyond canvas width', () => {
    const cell = hitTestCell(500, 50, 10, 10, 400, 400, 2);
    expect(cell).toBeNull();
  });

  it('returns null for y beyond canvas height', () => {
    const cell = hitTestCell(50, 500, 10, 10, 400, 400, 2);
    expect(cell).toBeNull();
  });

  it('returns null when grid is empty (zero rows)', () => {
    const cell = hitTestCell(100, 100, 0, 10, 400, 400, 2);
    expect(cell).toBeNull();
  });

  it('returns null when grid is empty (zero cols)', () => {
    const cell = hitTestCell(100, 100, 10, 0, 400, 400, 2);
    expect(cell).toBeNull();
  });
});
