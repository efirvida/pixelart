import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, KeyboardEvent } from 'react';
import { useGrid } from '../../context/GridContext';
import { Card } from '../../components/ui/Card/Card';
import { computeCellBounds, renderGridCells } from '../../lib/canvas-render';
import styles from './ComparisonSlider.module.css';

const CANVAS_PADDING = 2;

export default function ComparisonSlider() {
  const { grid, palette, originalImage } = useGrid();

  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState(400);
  const [liveMessage, setLiveMessage] = useState('');

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

  // Re-render the grid canvas using shared canvas-render module
  useEffect(() => {
    const canvas = gridCanvasRef.current;
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
  }, [grid, palette, size]);

  // ---- Drag handlers --------------------------------------------------------

  const updateRatio = useCallback((newRatio: number) => {
    const clamped = Math.round(Math.max(10, Math.min(90, newRatio)));
    setRatio(clamped);
    setLiveMessage(`Comparison at ${clamped}%`);
  }, []);

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
      const pct = (x / rect.width) * 100;
      updateRatio(pct);
    };

    const stop = () => setDragging(false);

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
  }, [dragging, updateRatio]);

  // ---- Keyboard handlers ----------------------------------------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateRatio(ratio - 2);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateRatio(ratio + 2);
      } else if (e.key === 'Home') {
        e.preventDefault();
        updateRatio(10);
      } else if (e.key === 'End') {
        e.preventDefault();
        updateRatio(90);
      }
    },
    [ratio, updateRatio],
  );

  // ---- Render ---------------------------------------------------------------

  if (!originalImage || grid.length === 0) {
    return (
      <Card className={styles.placeholder}>
        <p>Upload an image to see the comparison.</p>
      </Card>
    );
  }

  const dividerPx = 4;

  return (
    <>
      {/* Live region for position announcements */}
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </div>

      <div
        ref={containerRef}
        data-testid="comparison-slider"
        className={styles.container}
        style={{ width: size, height: size }}
      >
        {/* Left — original image */}
        <div
          className={styles.pane}
          style={{ width: `${ratio}%` }}
        >
          <img
            src={originalImage}
            alt="Original"
            draggable={false}
            className={styles.image}
            style={{ width: size, height: size }}
          />
        </div>

        {/* Right — matched grid */}
        <div
          className={styles.pane}
          style={{ left: `${ratio}%`, width: `${100 - ratio}%` }}
        >
          <canvas
            ref={gridCanvasRef}
            data-testid="comparison-grid-canvas"
            className={styles.canvas}
            style={{ width: size, height: size }}
          />
        </div>

        {/* Draggable divider */}
        <div
          data-testid="comparison-divider"
          role="slider"
          tabIndex={0}
          aria-label="Comparison slider"
          aria-valuemin={10}
          aria-valuemax={90}
          aria-valuenow={ratio}
          onMouseDown={startDrag}
          onKeyDown={handleKeyDown}
          className={`${styles.divider} ${dragging ? styles.dividerActive : ''}`}
          style={{ left: `calc(${ratio}% - ${dividerPx / 2}px)` }}
        />
      </div>
    </>
  );
}
