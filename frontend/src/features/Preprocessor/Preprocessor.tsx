import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGrid } from '../../context/GridContext';
import { matchGrid, ApiError } from '../../api/client';
import { useToast } from '../../components/feedback/Toast/ToastProvider';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { TextArea } from '../../components/ui/TextArea/TextArea';
import { Spinner } from '../../components/feedback/Spinner/Spinner';
import {
  DEFAULT_FILTERS,
  type FilterParams,
  applyFilters,
  extractRgbGrid,
  grayscaleBrightnessContrast,
  saturation,
  createOffscreenCanvas,
} from '../../lib/image-preprocess';
import ControlsPanel from './ControlsPanel';
import ImageCanvas from './ImageCanvas';
import PixelGridPreview from './PixelGridPreview';
import styles from './Preprocessor.module.css';

interface Props {
  file: File;
  onBack: () => void;
}

const MAX_SOURCE_DIM = 6000;

export default memo(Preprocessor);

/** Read a File as a data URL. */
function readFileAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(f);
  });
}

/** Accepted image MIME types. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Preprocessor({ file, onBack }: Props) {
  const { resetGrid } = useGrid();
  const toast = useToast();

  // ---- State ----------------------------------------------------------------

  const [params, setParams] = useState<FilterParams>(DEFAULT_FILTERS);
  const [processing, setProcessing] = useState(false);
  const [palette, setPalette] = useState('#000000\n#404040\n#B0B0B0\n#FFFFFF');
  const [sourceSize, setSourceSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState(600);
  const [imageReady, setImageReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // ---- Refs -----------------------------------------------------------------

  /** Offscreen canvas at (potentially capped) source resolution. */
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Visible preview canvas — rendered into by the preview effect. */
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  /** Container div for ResizeObserver. */
  const containerRef = useRef<HTMLDivElement>(null);
  /** Guards against re-applying initial crop when effect re-fires. */
  const loadedOnce = useRef(false);

  // ---- Derived --------------------------------------------------------------

  const sourceMinDim = useMemo(
    () => Math.min(sourceSize.w, sourceSize.h),
    [sourceSize],
  );

  const parsePalette = useCallback((): string[] => {
    return palette
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [palette]);

  // ---- ResizeObserver -------------------------------------------------------

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setDisplaySize(Math.max(200, Math.min(w, 600)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- File decode ----------------------------------------------------------

  const [dataUrl, setDataUrl] = useState<string | null>(null);

  // Stabilise callback/object refs so the effect only depends on `file`.
  // `toast` from useToast() changes on every ToastProvider render (new api {}),
  // and `onBack` could change if App re-renders — both would re-trigger the
  // decode effect and reset user-adjusted filter params.
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    let cancelled = false;
    const t = toastRef.current;
    const back = onBackRef.current;

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      t.error(
        'Unsupported file type. Please use JPEG, PNG, or WebP images.',
      );
      back();
      return;
    }

    async function load() {
      try {
        const url = await readFileAsDataUrl(file);
        if (cancelled) return;

        setDataUrl(url);

        const img = new Image();
        const loaded = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to decode image'));
        });
        img.src = url;
        await loaded;
        if (cancelled) return;

        let w = img.naturalWidth;
        let h = img.naturalHeight;

        // Cap enormous images
        if (w > MAX_SOURCE_DIM || h > MAX_SOURCE_DIM) {
          const s = MAX_SOURCE_DIM / Math.max(w, h);
          w = Math.round(w * s);
          h = Math.round(h * s);
          t.info(`Large image resized to ${w}×${h} for processing`);
        }

        // Create offscreen source canvas
        const canvas = createOffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        sourceCanvasRef.current = canvas;
        setSourceSize({ w, h });

        // On first load, set initial crop to center square.
        // On subsequent runs (from effect re-fire), preserve user params.
        if (!loadedOnce.current) {
          loadedOnce.current = true;
          const minDim = Math.min(w, h);
          setParams((p) => ({
            ...p,
            cropX: Math.round((w - minDim) / 2),
            cropY: Math.round((h - minDim) / 2),
            cropSize: minDim,
          }));
        }
        setSourceSize({ w, h });

        setImageReady(true);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to decode image';
          t.error(`${msg}. The file may be corrupted or in an unsupported format.`);
          back();
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [file]);

  // ---- Preview render -------------------------------------------------------

  useEffect(() => {
    const source = sourceCanvasRef.current;
    const display = previewCanvasRef.current;
    if (!source || !display || !imageReady) return;

    // Compute display dimensions maintaining aspect ratio
    const scale = Math.min(
      displaySize / sourceSize.w,
      displaySize / sourceSize.h,
      1,
    );
    const dw = Math.round(sourceSize.w * scale);
    const dh = Math.round(sourceSize.h * scale);

    display.width = dw;
    display.height = dh;

    // Draw source scaled down to display size
    const temp = createOffscreenCanvas(dw, dh);
    const tempCtx = temp.getContext('2d')!;
    tempCtx.drawImage(source, 0, 0, dw, dh);

    // Apply color transforms (no crop, no dithering for preview)
    const imageData = tempCtx.getImageData(0, 0, dw, dh);
    grayscaleBrightnessContrast(
      imageData,
      params.grayscale,
      params.brightness,
      params.contrast,
    );
    if (params.saturation !== 100) {
      saturation(imageData, params.saturation);
    }
    tempCtx.putImageData(imageData, 0, 0);

    // Render to visible canvas
    const ctx = display.getContext('2d')!;
    ctx.drawImage(temp, 0, 0);
  }, [params, sourceSize, displaySize, imageReady]);

  // ---- Handlers -------------------------------------------------------------

  const handleParamsChange = useCallback((next: FilterParams) => {
    setParams(next);
  }, []);

  const handleReset = useCallback(() => {
    if (sourceSize.w > 0 && sourceSize.h > 0) {
      const minDim = Math.min(sourceSize.w, sourceSize.h);
      setParams({
        ...DEFAULT_FILTERS,
        cropX: Math.round((sourceSize.w - minDim) / 2),
        cropY: Math.round((sourceSize.h - minDim) / 2),
        cropSize: minDim,
      });
    } else {
      setParams(DEFAULT_FILTERS);
    }
  }, [sourceSize]);

  const handleCropChange = useCallback(
    (crop: { cropX: number; cropY: number; cropSize: number }) => {
      setParams((prev) => ({ ...prev, ...crop }));
    },
    [],
  );

  const handleProcess = useCallback(async () => {
    const source = sourceCanvasRef.current;
    if (!source) return;

    const colors = parsePalette();
    if (colors.length === 0) {
      toast.error('Enter at least one palette colour.');
      return;
    }

    // Validate hex format
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const c of colors) {
      if (!hexRe.test(c)) {
        toast.error(`Invalid palette colour: "${c}". Expected #RRGGBB format.`);
        return;
      }
    }

    setProcessing(true);
    setStatusMessage('Processing image…');

    try {
      // Full filter chain at grid resolution from source
      const gridCanvas = applyFilters(
        source,
        params,
        params.gridSize,
      );

      const rgbGrid = extractRgbGrid(gridCanvas);

      const response = await matchGrid(rgbGrid, colors);

      // Use the cached dataUrl from initial load (faster, no re-read).
      // Fall back to reading the file again if dataUrl isn't ready yet.
      const src = dataUrl ?? await readFileAsDataUrl(file);
      resetGrid(response.grid, response.palette, src);

      setStatusMessage('Processing complete');
      toast.success('Image processed successfully');
    } catch (err) {
      let msg = 'An unexpected error occurred.';
      if (err instanceof ApiError) {
        msg = err.message;
        if (err.status === 422) {
          msg = `Invalid request: ${err.message}`;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setStatusMessage(`Processing failed: ${msg}`);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  }, [params, file, parsePalette, resetGrid, toast]);

  // ---- Render ---------------------------------------------------------------

  if (!imageReady) {
    return (
      <Card padding="lg" className={styles.loadingCard}>
        <Spinner size="lg" label="Loading image" />
        <p className={styles.loadingText}>Decoding image…</p>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className={styles.root}>
      {/* Status live region */}
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={onBack} disabled={processing}>
          ← Back
        </Button>
        <h2 className={styles.title}>Preprocessor</h2>
      </div>

      {/* Layout: image + controls side by side */}
      <div className={styles.layout}>
        {/* Left: image preview + grid preview */}
        <div className={styles.previewColumn}>
          <ImageCanvas
            previewCanvasRef={previewCanvasRef}
            sourceSize={sourceSize}
            displaySize={displaySize}
            params={params}
            onCropChange={handleCropChange}
            disabled={processing}
          />

          <PixelGridPreview
            sourceCanvas={sourceCanvasRef.current}
            params={params}
          />
        </div>

        {/* Right: controls + palette + action */}
        <div className={styles.controlsColumn}>
          <ControlsPanel
            params={params}
            sourceMinDim={sourceMinDim}
            onChange={handleParamsChange}
            onReset={handleReset}
            disabled={processing}
          />

          <TextArea
            label="Palette (one hex colour per line)"
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            rows={4}
            id="preprocessor-palette"
            disabled={processing}
          />

          <Button
            variant="primary"
            size="lg"
            onClick={handleProcess}
            loading={processing}
            disabled={processing}
            className={styles.processButton}
          >
            {processing ? 'Processing…' : 'Process Image'}
          </Button>
        </div>
      </div>
    </div>
  );
}
