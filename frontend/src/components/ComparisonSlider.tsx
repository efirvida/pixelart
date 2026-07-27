import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useGrid } from '../context/GridContext';

const CANVAS_PADDING = 2;

/**
 * Renders a grid into an offscreen canvas (same logic as ``GridEditor``).
 */
function renderGrid(
  canvas: HTMLCanvasElement,
  grid: number[][],
  palette: string[],
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
}

/**
 * A before/after comparison slider.
 *
 * - Left half shows the original uploaded image.
 * - Right half shows the palette-matched grid (with live edits).
 * - A draggable vertical divider lets the user adjust the split ratio.
 */
export default function ComparisonSlider() {
  const { grid, palette, originalImage } = useGrid();

  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(50); // percentage of original on the left
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState(400);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setSize(Math.max(200, Math.min(w, 600)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-render the grid canvas whenever state changes.
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    renderGrid(canvas, grid, palette);
  }, [grid, palette, size]);

  // ---- Drag handlers --------------------------------------------------------

  const startDrag = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const move = (e: globalThis.MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(10, Math.min(90, (x / rect.width) * 100));
      setRatio(pct);
    };

    const stop = () => setDragging(false);

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
  }, [dragging]);

  // ---- Render ---------------------------------------------------------------

  if (!originalImage || grid.length === 0) {
    return <p>Upload an image to see the comparison.</p>;
  }

  const dividerPx = 4;

  return (
    <div
      ref={containerRef}
      data-testid="comparison-slider"
      style={{
        position: 'relative',
        width: size,
        height: size,
        overflow: 'hidden',
        border: '1px solid #d1d5db',
        borderRadius: 4,
        userSelect: 'none',
      }}
    >
      {/* Left — original image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${ratio}%`,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <img
          src={originalImage}
          alt="Original"
          draggable={false}
          style={{
            display: 'block',
            width: size,
            height: size,
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Right — matched grid */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${ratio}%`,
          width: `${100 - ratio}%`,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={gridCanvasRef}
          data-testid="comparison-grid-canvas"
          style={{
            display: 'block',
            width: size,
            height: size,
          }}
        />
      </div>

      {/* Draggable divider */}
      <div
        data-testid="comparison-divider"
        onMouseDown={startDrag}
        style={{
          position: 'absolute',
          top: 0,
          left: `calc(${ratio}% - ${dividerPx / 2}px)`,
          width: dividerPx,
          height: '100%',
          background: dragging ? '#4f46e5' : '#9ca3af',
          cursor: 'col-resize',
          zIndex: 10,
          transition: dragging ? 'none' : 'background 0.15s',
        }}
      />
    </div>
  );
}
