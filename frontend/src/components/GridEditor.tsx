import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useGrid } from '../context/GridContext';

const CANVAS_PADDING = 2;

/** Render the palette-matched grid into an offscreen canvas. */
function renderGridToCanvas(
  canvas: HTMLCanvasElement,
  grid: number[][],
  palette: string[],
  highlightCell: { row: number; col: number } | null,
) {
  const rows = grid.length;
  if (rows === 0) return;
  const cols = grid[0].length;
  if (cols === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;

  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const cellW = (displayW - CANVAS_PADDING * 2) / cols;
  const cellH = (displayH - CANVAS_PADDING * 2) / rows;

  // Fill background.
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, displayW, displayH);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = grid[r]?.[c] ?? 0;
      ctx.fillStyle = palette[idx % palette.length] ?? '#000';
      ctx.fillRect(
        CANVAS_PADDING + c * cellW,
        CANVAS_PADDING + r * cellH,
        cellW,
        cellH,
      );
    }
  }

  // Highlight.
  if (highlightCell) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      CANVAS_PADDING + highlightCell.col * cellW,
      CANVAS_PADDING + highlightCell.row * cellH,
      cellW,
      cellH,
    );
  }
}

/**
 * Interactive pixel grid rendered on a ``<canvas>``.
 *
 * - Click a cell to cycle through the palette.
 * - ``Ctrl+Z`` to undo.
 */
export default function GridEditor() {
  const { grid, palette, undo, setCellColor } = useGrid();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCell, setHoverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [canvasSize, setCanvasSize] = useState(400);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setCanvasSize(Math.max(200, Math.min(w, 600)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-render the grid whenever state, hover, or size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderGridToCanvas(canvas, grid, palette, hoverCell);
  }, [grid, palette, hoverCell]);

  // Separate effect for canvas resize (causes re-layout, needs re-render too).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderGridToCanvas(canvas, grid, palette, hoverCell);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize]);

  // ---- Mouse handlers -------------------------------------------------------

  const getCell = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const rows = grid.length;
      if (rows === 0) return null;
      const cols = grid[0].length;
      const cellW = (canvas.clientWidth - CANVAS_PADDING * 2) / cols;
      const cellH = (canvas.clientHeight - CANVAS_PADDING * 2) / rows;
      const col = Math.floor((x - CANVAS_PADDING) / cellW);
      const row = Math.floor((y - CANVAS_PADDING) / cellH);
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
      return { row, col };
    },
    [grid.length, grid],
  );

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const cell = getCell(e.clientX, e.clientY);
      if (cell) setCellColor(cell.row, cell.col);
    },
    [getCell, setCellColor],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const cell = getCell(e.clientX, e.clientY);
      setHoverCell(cell);
    },
    [getCell],
  );

  const handleMouseLeave = useCallback(() => setHoverCell(null), []);

  // ---- Keyboard -------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  // ---- Render ---------------------------------------------------------------

  const size = grid.length;
  if (size === 0) {
    return <p>Upload an image to start editing the grid.</p>;
  }

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 600 }}>
      <p style={{ marginBottom: 4, fontSize: '0.875rem', color: '#6b7280' }}>
        Click a cell to cycle colour &bull; Ctrl+Z to undo
      </p>
      <canvas
        ref={canvasRef}
        data-testid="grid-canvas"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: canvasSize,
          height: canvasSize,
          border: '1px solid #d1d5db',
          borderRadius: 4,
          cursor: 'pointer',
          display: 'block',
        }}
      />
    </div>
  );
}
