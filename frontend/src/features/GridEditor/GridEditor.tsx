import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, KeyboardEvent } from 'react';
import { useGrid } from '../../context/GridContext';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import { Toolbar } from '../../components/layout/Toolbar/Toolbar';
import {
  computeCellBounds,
  renderGridCells,
  renderHighlight,
  hitTestCell,
} from '../../lib/canvas-render';
import styles from './GridEditor.module.css';

const CANVAS_PADDING = 2;

export default function GridEditor() {
  const { grid, palette, undo, setCellColor } = useGrid();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState(400);
  const [liveMessage, setLiveMessage] = useState('');

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

  // Re-render using shared canvas-render module
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;

    const rows = grid.length;
    const cols = grid[0].length;
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const bounds = computeCellBounds(displayW, displayH, rows, cols, CANVAS_PADDING);
    renderGridCells(ctx, grid, palette, bounds, CANVAS_PADDING);

    // Draw highlight for hover or focused cell
    const highlight = hoverCell ?? focusedCell;
    if (highlight) {
      renderHighlight(ctx, highlight, bounds, CANVAS_PADDING);
    }
  }, [grid, palette, hoverCell, focusedCell, canvasSize]);

  // Separate effect for canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const rows = grid.length;
    const cols = grid[0].length;
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const bounds = computeCellBounds(displayW, displayH, rows, cols, CANVAS_PADDING);
    renderGridCells(ctx, grid, palette, bounds, CANVAS_PADDING);

    const highlight = hoverCell ?? focusedCell;
    if (highlight) {
      renderHighlight(ctx, highlight, bounds, CANVAS_PADDING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize]);

  // ---- Click handling (uses hitTestCell from canvas-render) -----------------

  const getCellFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || grid.length === 0) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cols = grid[0].length;
      return hitTestCell(x, y, grid.length, cols, canvas.clientWidth, canvas.clientHeight, CANVAS_PADDING);
    },
    [grid],
  );

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e.clientX, e.clientY);
      if (cell) {
        setCellColor(cell.row, cell.col);
        setLiveMessage(`Cell ${cell.row}, ${cell.col} changed to colour ${(palette.length > 0) ? ((grid[cell.row]?.[cell.col] ?? 0) + 1) % palette.length : '—'}`);
      }
    },
    [getCellFromEvent, setCellColor, palette, grid],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e.clientX, e.clientY);
      setHoverCell(cell);
    },
    [getCellFromEvent],
  );

  const handleMouseLeave = useCallback(() => setHoverCell(null), []);

  // ---- Keyboard navigation --------------------------------------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLCanvasElement>) => {
      if (grid.length === 0) return;

      const rows = grid.length;
      const cols = grid[0].length;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedCell((prev) => {
          if (!prev) return { row: 0, col: 0 };
          let { row, col } = prev;
          if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
          if (e.key === 'ArrowDown') row = Math.min(rows - 1, row + 1);
          if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
          if (e.key === 'ArrowRight') col = Math.min(cols - 1, col + 1);
          return { row, col };
        });
        setHoverCell(null);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const cell = focusedCell;
        if (cell) {
          setCellColor(cell.row, cell.col);
          setLiveMessage(
            `Cell ${cell.row}, ${cell.col} changed to colour ${
              ((grid[cell.row]?.[cell.col] ?? 0) + 1) % palette.length
            }`,
          );
        }
      }
    },
    [grid, setCellColor, palette],
  );

  // Global Ctrl+Z
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
        setLiveMessage('Undo last change');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  // ---- Render ---------------------------------------------------------------

  const size = grid.length;
  if (size === 0) {
    return (
      <Card className={styles.placeholder}>
        <p>Upload an image to start editing the grid.</p>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className={styles.container}>
      {/* Live region */}
      <div
        className={styles.srOnly}
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      >
        {liveMessage}
      </div>

      {/* Toolbar */}
      <Toolbar align="start">
        <IconButton
          aria-label="Undo"
          variant="secondary"
          size="sm"
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </IconButton>
        <span className={styles.hint}>
          Arrow keys to navigate &bull; Enter/Space to recolor &bull; Ctrl+Z to undo
        </span>
      </Toolbar>

      {/* Grid canvas */}
      <canvas
        ref={canvasRef}
        data-testid="grid-canvas"
        aria-label="Grid editor"
        tabIndex={0}
        role="img"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!focusedCell) {
            setFocusedCell({ row: 0, col: 0 });
          }
        }}
        className={styles.canvas}
        style={{ width: canvasSize, height: canvasSize }}
      />
    </div>
  );
}
