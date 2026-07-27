import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  file: File;
  /** Called with (file, cropX, cropY, cropSize) in natural px */
  onConfirm: (file: File, cropX: number, cropY: number, cropSize: number) => void;
  onBack: () => void;
}

const MIN_SZ = 20;
const MAX_DISPLAY = 560;

/**
 * Crop panel — drag ON THE IMAGE to move the square.
 *
 * The mousedown listener goes directly on the <img> element.
 * If the user clicks inside the square → drag it.
 * If they click outside → the square stays where it is.
 * The slider below controls the square size.
 */
export default function ImageCropper({ file, onConfirm, onBack }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [area, setArea] = useState({ x: 0, y: 0, size: 100 });
  const [ready, setReady] = useState(false);

  const areaRef = useRef(area);
  areaRef.current = area;

  // ── Image load ──────────────────────────────────────────────────────

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
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
    if (img.complete) onload();
    else img.addEventListener('load', onload);
    return () => img.removeEventListener('load', onload);
  }, []);

  // ── Slider ──────────────────────────────────────────────────────────

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

  // ── Mouse handling — all native, all on the <img> ───────────────────

  const tracking = useRef<{ offX: number; offY: number } | null>(null);

  // Global mousemove/mouseup — registered ONCE
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

  // mousedown goes DIRECTLY on the <img> via React onMouseDown.
  // No refs, no effects, no cleanup.
  const onImgMouseDown = useCallback(
    (ev: React.MouseEvent) => {
      if (!areaRef.current || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const a = areaRef.current;
      // Only drag if inside the square
      if (mx >= a.x && mx <= a.x + a.size && my >= a.y && my <= a.y + a.size) {
        tracking.current = { offX: mx - a.x, offY: my - a.y };
        ev.preventDefault();
      }
    },
    [], // stable — reads areaRef.current
  );

  // ── Confirm ─────────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const a = areaRef.current;
    if (!a || !natural.w || !imgSize.w) return;
    const scale = natural.w / imgSize.w;
    onConfirm(file, Math.round(a.x * scale), Math.round(a.y * scale), Math.round(a.size * scale));
  }, [natural, imgSize, file, onConfirm]);

  // ── Render ──────────────────────────────────────────────────────────

  const toNatPx = natural.w && imgSize.w ? Math.round(area.size * natural.w / imgSize.w) : 0;

  return (
    <div style={{ maxWidth: MAX_DISPLAY + 80, margin: '0 auto' }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>
        Drag the image to move the crop area &middot; Use the slider to resize
      </p>

      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          overflow: 'hidden',
          userSelect: 'none',
          lineHeight: 0,
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/img-redundant-alt, jsx-a11y/no-noninteractive-element-interactions */}
        <img
          ref={imgRef}
          src={URL.createObjectURL(file)}
          alt="Crop preview"
          draggable={false}
          onMouseDown={onImgMouseDown}
          style={{
            display: 'block',
            width: imgSize.w || 1,
            height: imgSize.h || 1,
            cursor: tracking.current ? 'grabbing' : 'default',
          }}
        />

        {ready && (
          <>
            {/* Dim overlay */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
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

            {/* Frame border — pure visual, no events */}
            <div
              style={{
                position: 'absolute',
                left: area.x,
                top: area.y,
                width: area.size,
                height: area.size,
                border: '2px solid #fff',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            >
              <div style={{ position: 'absolute', top: -3, left: -3, width: 6, height: 6, background: '#4f46e5', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, background: '#4f46e5', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: -3, left: -3, width: 6, height: 6, background: '#4f46e5', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: -3, right: -3, width: 6, height: 6, background: '#4f46e5', borderRadius: '50%' }} />
            </div>
          </>
        )}
      </div>

      {ready && (
        <>
          <div style={{ marginTop: 12, maxWidth: imgSize.w }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Crop size: {toNatPx}×{toNatPx} px
            </label>
            <input
              type="range"
              min={MIN_SZ}
              max={Math.min(imgSize.w, imgSize.h)}
              value={area.size}
              onChange={(e) => onSlider(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={onBack} style={{ padding: '8px 20px', background: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Back
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Pixelate this area
            </button>
          </div>
        </>
      )}
    </div>
  );
}
