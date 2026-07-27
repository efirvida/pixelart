import { useEffect, useRef, useState } from 'react';
import {
  applyFilters,
  type FilterParams,
  createOffscreenCanvas,
} from '../../lib/image-preprocess';
import styles from './PixelGridPreview.module.css';

interface Props {
  sourceCanvas: HTMLCanvasElement | null;
  params: FilterParams;
}

/**
 * Small debounced N×N canvas preview of the pixel grid result.
 *
 * Applies the full filter chain (including crop and dithering) at
 * ``params.gridSize`` resolution, then renders the result to a tiny
 * ``<canvas>``. Updated with a 150 ms debounce to avoid jank during
 * rapid slider drags.
 */
export default function PixelGridPreview({
  sourceCanvas,
  params,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [label, setLabel] = useState(
    `${params.gridSize}×${params.gridSize} = ${params.gridSize * params.gridSize} cells`,
  );

  useEffect(() => {
    setLabel(
      `${params.gridSize}×${params.gridSize} = ${params.gridSize * params.gridSize} cells`,
    );

    if (!sourceCanvas) return;

    // Debounce: clear previous timer, schedule new render
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const size = params.gridSize;
      const out = applyFilters(sourceCanvas, params, size);

      // Scale up to a visible preview size (capped at 160 px)
      const previewSize = Math.min(size, 160);
      const display = createOffscreenCanvas(previewSize, previewSize);
      const dCtx = display.getContext('2d')!;

      // Nearest-neighbour scaling for crisp pixels
      dCtx.imageSmoothingEnabled = false;
      dCtx.drawImage(out, 0, 0, previewSize, previewSize);

      canvas.width = previewSize;
      canvas.height = previewSize;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(display, 0, 0);
    }, 150);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sourceCanvas, params]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={`Pixel grid preview: ${params.gridSize} by ${params.gridSize} cells`}
      />
      <span className={styles.label} aria-live="polite">
        {label}
      </span>
    </div>
  );
}
