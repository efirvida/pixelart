import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { RangeSlider } from '../../components/ui/RangeSlider/RangeSlider';
import styles from './ImageCropper.module.css';

interface Props {
  file: File;
  onConfirm: (file: File, cropX: number, cropY: number, cropSize: number) => void;
  onBack: () => void;
}

const MIN_SZ = 20;
const MAX_DISPLAY = 560;

export default function ImageCropper({ file, onConfirm, onBack }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [area, setArea] = useState({ x: 0, y: 0, size: 100 });
  const [ready, setReady] = useState(false);

  const areaRef = useRef(area);
  areaRef.current = area;

  // Memoize blob URL so the <img> src is stable across renders.
  // Without this, URL.createObjectURL(file) creates a NEW url every
  // render, causing the image to reload and reset the crop area.
  const [blobUrl, setBlobUrl] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Image load — runs once per file ───────────────────────────

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !blobUrl) return;
    const onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const s = Math.min(MAX_DISPLAY / nw, MAX_DISPLAY / nh, 1);
      const dw = Math.round(nw * s);
      const dh = Math.round(nh * s);
      setNatural({ w: nw, h: nh });
      setImgSize({ w: dw, h: dh });
      const sz = Math.round(Math.min(dw, dh) * 0.55);
      setArea({ x: Math.round((dw - sz) / 2), y: Math.round((dh - sz) / 2), size: sz });
      setReady(true);
    };
    // Guard: if already initialized, don't reset on re-loads
    if (img.complete && natural.w === 0) onload();
    else if (natural.w === 0) img.addEventListener('load', onload, { once: true });
    return () => {
      // no-op — { once: true } auto-removes
    };
  }, [blobUrl]);

  // ── Slider ────────────────────────────────────────────────────

  const onSlider = useCallback(
    (v: number) => {
      setArea((prev) => {
        const ns = Math.max(MIN_SZ, Math.min(v, imgSize.w, imgSize.h));
        return {
          x: Math.min(prev.x, imgSize.w - ns),
          y: Math.min(prev.y, imgSize.h - ns),
          size: ns,
        };
      });
    },
    [imgSize],
  );

  // ── Mouse handling — all native, all on the <img> ─────────────

  const tracking = useRef<{ offX: number; offY: number } | null>(null);

  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      const t = tracking.current;
      if (!t) return;
      const rect = imgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      setArea((prev) => {
        let nx = mx - t.offX;
        let ny = my - t.offY;
        nx = Math.max(0, Math.min(nx, imgSize.w - prev.size));
        ny = Math.max(0, Math.min(ny, imgSize.h - prev.size));
        return { x: Math.round(nx), y: Math.round(ny), size: prev.size };
      });
    };
    const onUp = () => { tracking.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [imgSize]);

  const onImgMouseDown = useCallback(
    (ev: React.MouseEvent) => {
      if (!areaRef.current || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const a = areaRef.current;
      if (mx >= a.x && mx <= a.x + a.size && my >= a.y && my <= a.y + a.size) {
        tracking.current = { offX: mx - a.x, offY: my - a.y };
        ev.preventDefault();
      }
    },
    [],
  );

  // ── Confirm ───────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const a = areaRef.current;
    if (!a || !natural.w || !imgSize.w) return;
    const scale = natural.w / imgSize.w;
    onConfirm(file, Math.round(a.x * scale), Math.round(a.y * scale), Math.round(a.size * scale));
  }, [natural, imgSize, file, onConfirm]);

  // ── Render ────────────────────────────────────────────────────

  const toNatPx = natural.w && imgSize.w ? Math.round(area.size * natural.w / imgSize.w) : 0;

  return (
    <div className={styles.container}>
      <p className={styles.instructions}>
        Drag the image to move the crop area &middot; Use the slider to resize
      </p>

      <div className={styles.viewport}>
        <img
          ref={imgRef}
          src={blobUrl || undefined}
          alt="Crop preview"
          draggable={false}
          onMouseDown={onImgMouseDown}
          className={styles.image}
          style={{
            width: imgSize.w || 1,
            height: imgSize.h || 1,
            cursor: tracking.current ? 'grabbing' : 'default',
          }}
        />

        {ready && (
          <>
            <svg
              className={styles.overlay}
              width={imgSize.w}
              height={imgSize.h}
            >
              <defs>
                <mask id="cm">
                  <rect width={imgSize.w} height={imgSize.h} fill="white" />
                  <rect x={area.x} y={area.y} width={area.size} height={area.size} fill="black" />
                </mask>
              </defs>
              <rect width={imgSize.w} height={imgSize.h} fill="rgba(0,0,0,0.45)" mask="url(#cm)" />
            </svg>

            <div
              className={styles.frame}
              style={{
                left: area.x,
                top: area.y,
                width: area.size,
                height: area.size,
              }}
            >
              <span className={`${styles.handle} ${styles.handleTL}`} />
              <span className={`${styles.handle} ${styles.handleTR}`} />
              <span className={`${styles.handle} ${styles.handleBL}`} />
              <span className={`${styles.handle} ${styles.handleBR}`} />
            </div>
          </>
        )}
      </div>

      {ready && (
        <>
          <div className={styles.controls}>
            <RangeSlider
              label={`Crop size: ${toNatPx}×${toNatPx} px`}
              min={MIN_SZ}
              max={Math.min(imgSize.w, imgSize.h)}
              value={area.size}
              onChange={onSlider}
            />
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              Pixelate this area
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
