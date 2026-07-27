/**
 * Pure Canvas-API image preprocessing functions.
 *
 * Zero React dependencies — all functions operate on ImageData, Uint8ClampedArray,
 * or HTMLCanvasElement. No JSX, no hooks, no component patterns.
 *
 * Filter chain (matches the design doc):
 *   1. Grayscale + Brightness + Contrast  (combined pixel pass)
 *   2. Saturation                         (separate HSL pass)
 *   3. Dithering                          (Floyd-Steinberg on N×N grid)
 */

// ── Types ──────────────────────────────────────────────────────

export interface FilterParams {
  grayscale: boolean;
  brightness: number;      // -100 to +100
  contrast: number;        // -100 to +100
  saturation: number;      // 0 to 200 (100 = original)
  cropX: number;           // source canvas coordinates
  cropY: number;
  cropSize: number;        // square side length; 0 = center square (auto)
  gridSize: number;        // 5 to 200
  dithering: boolean;
  ditherIntensity: number; // 0 to 100
}

export const DEFAULT_FILTERS: FilterParams = {
  grayscale: true,
  brightness: 0,
  contrast: 0,
  saturation: 100,
  cropX: 0,
  cropY: 0,
  cropSize: 0,
  gridSize: 29,
  dithering: false,
  ditherIntensity: 50,
};

// ── Helpers ────────────────────────────────────────────────────

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Create a detached HTMLCanvasElement with the given dimensions. */
export function createOffscreenCanvas(
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// ── Per-pixel transforms ───────────────────────────────────────

/**
 * Combined grayscale (ITU-R 601-2), brightness, and contrast — single pixel pass.
 *
 * Grayscale:  L = 0.299·R + 0.587·G + 0.114·B
 * Brightness: additive, mapped from [-100, +100] to [-255, +255]
 * Contrast:   (v - 128) × factor + 128
 *             factor = (259 × (c + 255)) / (255 × (259 - c))
 *             where c ∈ [-100, +100]
 *
 * When `grayscale` is OFF, brightness and contrast apply to each RGB
 * channel independently (luminance step is skipped).
 */
export function grayscaleBrightnessContrast(
  imageData: ImageData,
  grayscale: boolean,
  brightnessValue: number,
  contrastValue: number,
): ImageData {
  const { data } = imageData;
  const brightness = (brightnessValue / 100) * 255; // [-255, 255]
  const c = contrastValue; // [-100, 100]

  // Derived from (259·(c+255)) / (255·(259-c))
  const factor = (259 * (c + 255)) / (255 * (259 - c));

  // Write into a separate buffer so no pixel sees its neighbor's
  // already-transformed value during this pass.
  const output = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (grayscale) {
      // ITU-R 601-2 luminance
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const lit = luma + brightness;
      const contrasted = (lit - 128) * factor + 128;
      const val = clamp(Math.round(contrasted), 0, 255);
      output[i] = val;
      output[i + 1] = val;
      output[i + 2] = val;
    } else {
      const rAdj = clamp(
        Math.round((r + brightness - 128) * factor + 128),
        0,
        255,
      );
      const gAdj = clamp(
        Math.round((g + brightness - 128) * factor + 128),
        0,
        255,
      );
      const bAdj = clamp(
        Math.round((b + brightness - 128) * factor + 128),
        0,
        255,
      );
      output[i] = rAdj;
      output[i + 1] = gAdj;
      output[i + 2] = bAdj;
    }

    output[i + 3] = a;
  }

  // Copy the transformed pixels back into the original ImageData.
  for (let i = 0; i < data.length; i++) {
    data[i] = output[i];
  }

  return imageData;
}

/**
 * Adjust saturation via HSL conversion.
 *
 * @param percent  0 = fully desaturated (grayscale), 100 = original, 200 = double
 */
export function saturation(imageData: ImageData, percent: number): ImageData {
  const { data } = imageData;
  const factor = percent / 100;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const l = (max + min) / 2;

    if (max === min) {
      // Achromatic pixel — no change
      continue;
    }

    const d = max - min;
    let s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    s = clamp(s * factor, 0, 1);

    // Determine hue
    let h: number;
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const hue2rgb = (t: number): number => {
      let tc = t;
      if (tc < 0) tc += 1;
      if (tc > 1) tc -= 1;
      if (tc < 1 / 6) return p + (q - p) * 6 * tc;
      if (tc < 1 / 2) return q;
      if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
      return p;
    };

    data[i] = Math.round(hue2rgb(h + 1 / 3) * 255);
    data[i + 1] = Math.round(hue2rgb(h) * 255);
    data[i + 2] = Math.round(hue2rgb(h - 1 / 3) * 255);
  }

  return imageData;
}

/**
 * Floyd-Steinberg error diffusion dithering on a grayscale image.
 *
 * Assumes the image is already grayscale (R ≈ G ≈ B).  Reads the R channel,
 * quantizes to 0 or 255, and diffuses the error to unprocessed neighbors.
 *
 * @param intensity  0 = no dithering, 100 = full error diffusion
 */
export function floydSteinbergDither(
  imageData: ImageData,
  intensity: number,
): ImageData {
  const { data } = imageData;
  const w = imageData.width;
  const h = imageData.height;

  if (intensity <= 0) return imageData;

  const scale = intensity / 100;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Use the R channel (all channels equal after grayscale)
      const oldVal = data[idx];
      const newVal = oldVal > 128 ? 255 : 0;
      const error = Math.round((oldVal - newVal) * scale);

      data[idx] = newVal;
      data[idx + 1] = newVal;
      data[idx + 2] = newVal;

      if (error === 0) continue;

      // Floyd-Steinberg kernel: [* 7/16] [3/16 5/16 1/16]

      // Right neighbor (7/16)
      if (x + 1 < w) {
        const n = idx + 4;
        data[n] = clamp(data[n] + (error * 7) / 16, 0, 255);
        data[n + 1] = clamp(data[n + 1] + (error * 7) / 16, 0, 255);
        data[n + 2] = clamp(data[n + 2] + (error * 7) / 16, 0, 255);
      }
      // Bottom-left (3/16)
      if (y + 1 < h && x - 1 >= 0) {
        const n = ((y + 1) * w + (x - 1)) * 4;
        data[n] = clamp(data[n] + (error * 3) / 16, 0, 255);
        data[n + 1] = clamp(data[n + 1] + (error * 3) / 16, 0, 255);
        data[n + 2] = clamp(data[n + 2] + (error * 3) / 16, 0, 255);
      }
      // Bottom (5/16)
      if (y + 1 < h) {
        const n = ((y + 1) * w + x) * 4;
        data[n] = clamp(data[n] + (error * 5) / 16, 0, 255);
        data[n + 1] = clamp(data[n + 1] + (error * 5) / 16, 0, 255);
        data[n + 2] = clamp(data[n + 2] + (error * 5) / 16, 0, 255);
      }
      // Bottom-right (1/16)
      if (y + 1 < h && x + 1 < w) {
        const n = ((y + 1) * w + (x + 1)) * 4;
        data[n] = clamp(data[n] + (error * 1) / 16, 0, 255);
        data[n + 1] = clamp(data[n + 1] + (error * 1) / 16, 0, 255);
        data[n + 2] = clamp(data[n + 2] + (error * 1) / 16, 0, 255);
      }
    }
  }

  return imageData;
}

// ── Pipeline orchestration ────────────────────────────────────

/**
 * Apply the full filter chain to a source canvas and produce an output canvas
 * sized targetSize × targetSize.
 *
 * Filter chain:
 *   1. Crop & resize in one drawImage call
 *   2. Grayscale + brightness + contrast (combined pixel pass)
 *   3. Saturation (separate HSL pass — skipped when saturation === 100)
 *   4. Dithering (Floyd-Steinberg on the small grid — skipped when off)
 */
export function applyFilters(
  sourceCanvas: HTMLCanvasElement,
  params: FilterParams,
  targetSize: number,
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // Determine crop rect in source coordinates
  let cropX = params.cropX;
  let cropY = params.cropY;
  let cropSize = params.cropSize;

  if (cropSize <= 0) {
    // Auto: center square taking the full smaller dimension
    cropSize = Math.min(srcW, srcH);
    cropX = Math.round((srcW - cropSize) / 2);
    cropY = Math.round((srcH - cropSize) / 2);
  }

  // Clamp crop to source bounds
  cropX = clamp(cropX, 0, srcW - 1);
  cropY = clamp(cropY, 0, srcH - 1);
  cropSize = clamp(cropSize, 1, Math.min(srcW - cropX, srcH - cropY));

  // Create output canvas and context
  const outCanvas = createOffscreenCanvas(targetSize, targetSize);
  const outCtx = outCanvas.getContext('2d')!;

  // Step 1: Crop & resize in one GPU-accelerated operation
  outCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropSize,
    cropSize, // source rect
    0,
    0,
    targetSize,
    targetSize, // dest rect
  );

  // Step 2: Get ImageData for pixel-level transforms
  const imageData = outCtx.getImageData(0, 0, targetSize, targetSize);

  // Step 3: Combined grayscale + brightness + contrast
  grayscaleBrightnessContrast(
    imageData,
    params.grayscale,
    params.brightness,
    params.contrast,
  );

  // Step 4: Saturation (idempotent when at 100%)
  if (params.saturation !== 100) {
    saturation(imageData, params.saturation);
  }

  // Step 5: Dithering on the small grid
  if (params.dithering && params.ditherIntensity > 0) {
    floydSteinbergDither(imageData, params.ditherIntensity);
  }

  // Write processed pixels back
  outCtx.putImageData(imageData, 0, 0);

  return outCanvas;
}

/**
 * Extract an H×W RGB grid from a canvas as `number[][][]`.
 *
 * Each element is `[R, G, B]` with values 0-255.
 * Grid dimensions: `grid.length === canvas.height`, `grid[0].length === canvas.width`.
 */
export function extractRgbGrid(canvas: HTMLCanvasElement): number[][][] {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  const grid: number[][][] = [];

  for (let row = 0; row < h; row++) {
    const rowData: number[][] = [];
    for (let col = 0; col < w; col++) {
      const idx = (row * w + col) * 4;
      rowData.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    grid.push(rowData);
  }

  return grid;
}
