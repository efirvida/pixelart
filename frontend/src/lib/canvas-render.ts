/**
 * Shared canvas-render module for the Pixel Art Editor.
 *
 * Pure functions that handle cell-bounds calculation, grid rendering, highlight
 * drawing, and hit testing. Both ``GridEditor`` and ``ComparisonSlider``
 * consume these functions so the math stays in one place.
 */

// ---- Interfaces ------------------------------------------------------------

export interface RenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CellBounds extends RenderBounds {
  row: number;
  col: number;
}

// ---- computeCellBounds -----------------------------------------------------

/**
 * Given the displayed canvas dimensions and a grid layout, return the width
 * and height of each cell (accounting for outer padding).
 */
export function computeCellBounds(
  canvasWidth: number,
  canvasHeight: number,
  rows: number,
  cols: number,
  padding: number,
): { cellW: number; cellH: number } {
  const cellW = (canvasWidth - padding * 2) / cols;
  const cellH = (canvasHeight - padding * 2) / rows;
  return { cellW, cellH };
}

// ---- renderGridCells -------------------------------------------------------

/**
 * Draw every cell of ``grid`` onto *ctx*, using ``palette`` for colour lookup.
 * A single background fill is drawn first; then each cell is filled via the
 * palette index stored in the grid.
 */
export function renderGridCells(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  palette: string[],
  bounds: { cellW: number; cellH: number },
  padding: number,
): void {
  const rows = grid.length;
  if (rows === 0) return;
  const cols = grid[0].length;
  if (cols === 0) return;

  // Background.
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, bounds.cellW * cols + padding * 2, bounds.cellH * rows + padding * 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = grid[r]?.[c] ?? 0;
      ctx.fillStyle = palette[idx % palette.length] ?? '#000';
      ctx.fillRect(
        padding + c * bounds.cellW,
        padding + r * bounds.cellH,
        bounds.cellW,
        bounds.cellH,
      );
    }
  }
}

// ---- renderHighlight -------------------------------------------------------

/**
 * Draw a highlight (default amber) stroke around a single cell.
 */
export function renderHighlight(
  ctx: CanvasRenderingContext2D,
  cell: { row: number; col: number },
  bounds: { cellW: number; cellH: number },
  padding: number,
  color = '#fbbf24',
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    padding + cell.col * bounds.cellW,
    padding + cell.row * bounds.cellH,
    bounds.cellW,
    bounds.cellH,
  );
}

// ---- hitTestCell -----------------------------------------------------------

/**
 * Map a click/touch coordinate (relative to the canvas origin) to a grid cell.
 * Returns ``null`` when the point lies outside any cell.
 */
export function hitTestCell(
  x: number,
  y: number,
  rows: number,
  cols: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
): { row: number; col: number } | null {
  if (rows === 0 || cols === 0) return null;

  const cellW = (canvasWidth - padding * 2) / cols;
  const cellH = (canvasHeight - padding * 2) / rows;

  const col = Math.floor((x - padding) / cellW);
  const row = Math.floor((y - padding) / cellH);

  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}
