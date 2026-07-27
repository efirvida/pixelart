import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FilterParams } from '../../lib/image-preprocess';
import styles from './ImageCanvas.module.css';

interface Props {
  /** Ref to the visible ``<canvas>`` where the preview is rendered. */
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Natural (source) dimensions of the loaded image. */
  sourceSize: { w: number; h: number };
  /** Max side length of the display canvas (from container ResizeObserver). */
  displaySize: number;
  /** Current filter params — cropX / cropY / cropSize in SOURCE coordinates. */
  params: FilterParams;
  /** Called when the user drags the crop rectangle. Values in SOURCE coordinates. */
  onCropChange: (crop: {
    cropX: number;
    cropY: number;
    cropSize: number;
  }) => void;
  disabled?: boolean;
}

/** Scale factor from source size to display size. */
function computeScale(
  sourceW: number,
  sourceH: number,
  maxDisplay: number,
): number {
  if (sourceW <= 0 || sourceH <= 0) return 1;
  return Math.min(maxDisplay / sourceW, maxDisplay / sourceH, 1);
}

export default function ImageCanvas({
  previewCanvasRef,
  sourceSize,
  displaySize,
  params,
  onCropChange,
  disabled = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracking = useRef<{ offX: number; offY: number } | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const scale = useMemo(
    () => computeScale(sourceSize.w, sourceSize.h, displaySize),
    [sourceSize, displaySize],
  );

  const dw = useMemo(() => Math.round(sourceSize.w * scale), [sourceSize.w, scale]);
  const dh = useMemo(() => Math.round(sourceSize.h * scale), [sourceSize.h, scale]);

  // Crop rect in display coordinates
  const displayCrop = useMemo(() => {
    const cx = Math.round(params.cropX * scale);
    const cy = Math.round(params.cropY * scale);
    const cs = Math.round(params.cropSize * scale);
    return { x: cx, y: cy, size: cs };
  }, [params.cropX, params.cropY, params.cropSize, scale]);

  // --- Drag handlers (mirrors ImageCropper pattern) --------------------------

  useEffect(() => {
    if (disabled) return;

    const onMove = (ev: MouseEvent) => {
      const t = tracking.current;
      if (!t) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;

      const { cropSize } = paramsRef.current;
      const displayCropSz = Math.round(cropSize * scale);

      let nx = mx - t.offX;
      let ny = my - t.offY;
      // Clamp to display bounds
      nx = Math.max(0, Math.min(Math.round(nx), dw - displayCropSz));
      ny = Math.max(0, Math.min(Math.round(ny), dh - displayCropSz));

      onCropChange({
        cropX: Math.round(nx / scale),
        cropY: Math.round(ny / scale),
        cropSize,
      });
    };

    const onUp = () => {
      tracking.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [disabled, scale, dw, dh, onCropChange]);

  // Touch support
  useEffect(() => {
    if (disabled) return;

    const onTouchMove = (ev: TouchEvent) => {
      const t = tracking.current;
      if (!t || !ev.touches[0]) return;
      ev.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = ev.touches[0].clientX - rect.left;
      const my = ev.touches[0].clientY - rect.top;

      const { cropSize } = paramsRef.current;
      const displayCropSz = Math.round(cropSize * scale);

      let nx = mx - t.offX;
      let ny = my - t.offY;
      nx = Math.max(0, Math.min(Math.round(nx), dw - displayCropSz));
      ny = Math.max(0, Math.min(Math.round(ny), dh - displayCropSz));

      onCropChange({
        cropX: Math.round(nx / scale),
        cropY: Math.round(ny / scale),
        cropSize,
      });
    };

    const onTouchEnd = () => {
      tracking.current = null;
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, scale, dw, dh, onCropChange]);

  const handleMouseDown = useCallback(
    (ev: React.MouseEvent) => {
      if (disabled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const { x, y, size } = displayCrop;

      if (mx >= x && mx <= x + size && my >= y && my <= y + size) {
        tracking.current = { offX: mx - x, offY: my - y };
        ev.preventDefault();
      }
    },
    [disabled, displayCrop],
  );

  const handleTouchStart = useCallback(
    (ev: React.TouchEvent) => {
      if (disabled || !containerRef.current || !ev.touches[0]) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = ev.touches[0].clientX - rect.left;
      const my = ev.touches[0].clientY - rect.top;
      const { x, y, size } = displayCrop;

      if (mx >= x && mx <= x + size && my >= y && my <= y + size) {
        tracking.current = { offX: mx - x, offY: my - y };
        ev.preventDefault();
      }
    },
    [disabled, displayCrop],
  );

  if (sourceSize.w <= 0 || sourceSize.h <= 0) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>Loading image…</div>
      </div>
    );
  }

  const hasCrop = displayCrop.size > 0;

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ width: dw, height: dh }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* The rendered preview canvas */}
      <canvas
        ref={previewCanvasRef}
        className={styles.canvas}
        style={{ width: dw, height: dh }}
        aria-label="Image preview with filters applied"
      />

      {/* Crop overlay — SVG mask pattern (same technique as ImageCropper) */}
      {hasCrop && !disabled && (
        <svg
          className={styles.overlay}
          width={dw}
          height={dh}
          style={{ cursor: tracking.current ? 'grabbing' : 'default' }}
          pointerEvents="none"
        >
          <defs>
            <mask id="preproc-crop-mask">
              <rect width={dw} height={dh} fill="white" />
              <rect
                x={displayCrop.x}
                y={displayCrop.y}
                width={displayCrop.size}
                height={displayCrop.size}
                fill="black"
              />
            </mask>
          </defs>

          {/* Dark overlay outside crop */}
          <rect
            width={dw}
            height={dh}
            fill="rgba(0,0,0,0.45)"
            mask="url(#preproc-crop-mask)"
          />

          {/* Crop border */}
          <rect
            x={displayCrop.x}
            y={displayCrop.y}
            width={displayCrop.size}
            height={displayCrop.size}
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          />

          {/* Corner handles */}
          <circle cx={displayCrop.x} cy={displayCrop.y} r="4" fill="var(--color-primary)" />
          <circle cx={displayCrop.x + displayCrop.size} cy={displayCrop.y} r="4" fill="var(--color-primary)" />
          <circle cx={displayCrop.x} cy={displayCrop.y + displayCrop.size} r="4" fill="var(--color-primary)" />
          <circle cx={displayCrop.x + displayCrop.size} cy={displayCrop.y + displayCrop.size} r="4" fill="var(--color-primary)" />
        </svg>
      )}
    </div>
  );
}
