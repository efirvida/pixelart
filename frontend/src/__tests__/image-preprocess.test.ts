import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  clamp,
  createOffscreenCanvas,
  grayscaleBrightnessContrast,
  saturation,
  floydSteinbergDither,
  applyFilters,
  extractRgbGrid,
  DEFAULT_FILTERS,
  type FilterParams,
} from '../lib/image-preprocess';

// ── Helpers ────────────────────────────────────────────────────

/**
 * Build an ImageData-compatible object.
 *
 * jsdom in this environment does not expose the `ImageData` constructor
 * as a global, so we construct the shape directly.
 */
function makeImageData(w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  // Fill alpha channel with 255 (fully opaque).
  for (let i = 3; i < data.length; i += 4) {
    data[i] = 255;
  }
  return { data, width: w, height: h, colorSpace: 'srgb' } as unknown as ImageData;
}

/** Create an ImageData filled with a single RGB colour. */
function makeFilledImageData(
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
): ImageData {
  const d = makeImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i] = r;
    d.data[i + 1] = g;
    d.data[i + 2] = b;
  }
  return d;
}

/**
 * Build a mock CanvasRenderingContext2D that stores/returns a real ImageData.
 */
function makeMockCtx(stored: ImageData | null = null) {
  let current = stored;

  return {
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
      if (current === null) {
        current = makeFilledImageData(w, h, 128, 128, 128);
      }
      return current;
    }),
    putImageData: vi.fn((imgData: ImageData) => {
      current = imgData;
    }),
  } as unknown as CanvasRenderingContext2D;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── clamp ──────────────────────────────────────────────────────

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('returns min when value is below', () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it('returns max when value is above', () => {
    expect(clamp(200, 0, 100)).toBe(100);
  });

  it('works with negative ranges', () => {
    expect(clamp(-150, -100, 100)).toBe(-100);
    expect(clamp(150, -100, 100)).toBe(100);
  });

  it('returns exact boundary values', () => {
    expect(clamp(0, 0, 255)).toBe(0);
    expect(clamp(255, 0, 255)).toBe(255);
  });
});

// ── createOffscreenCanvas ──────────────────────────────────────

describe('createOffscreenCanvas', () => {
  it('creates a canvas with the correct dimensions', () => {
    const c = createOffscreenCanvas(320, 200);
    expect(c).toBeInstanceOf(HTMLCanvasElement);
    expect(c.width).toBe(320);
    expect(c.height).toBe(200);
  });

  it('creates a square canvas', () => {
    const c = createOffscreenCanvas(29, 29);
    expect(c.width).toBe(29);
    expect(c.height).toBe(29);
  });
});

// ── grayscaleBrightnessContrast ────────────────────────────────

describe('grayscaleBrightnessContrast', () => {
  it('produces R=G=B for each pixel when grayscale is ON', () => {
    const d = makeFilledImageData(4, 4, 200, 50, 30);
    grayscaleBrightnessContrast(d, true, 0, 0);

    for (let i = 0; i < d.data.length; i += 4) {
      const r = d.data[i];
      const g = d.data[i + 1];
      const b = d.data[i + 2];
      expect(r).toBe(g);
      expect(g).toBe(b);
    }
  });

  it('produces correct ITU-R 601-2 luminance for a known color', () => {
    // Pure red: 0.299*255 + 0.587*0 + 0.114*0 = 76.245 → Math.round = 76
    const d = makeFilledImageData(1, 1, 255, 0, 0);
    grayscaleBrightnessContrast(d, true, 0, 0);
    expect(d.data[0]).toBe(76);
    expect(d.data[1]).toBe(76);
    expect(d.data[2]).toBe(76);
  });

  it('preserves individual channels when grayscale is OFF (no brightness/contrast change)', () => {
    const d = makeFilledImageData(2, 2, 100, 150, 200);
    grayscaleBrightnessContrast(d, false, 0, 0);

    expect(d.data[0]).toBe(100);
    expect(d.data[1]).toBe(150);
    expect(d.data[2]).toBe(200);
  });

  it('increases brightness on all pixels when positive', () => {
    const d = makeFilledImageData(2, 2, 100, 100, 100);
    grayscaleBrightnessContrast(d, false, 50, 0);

    for (let i = 0; i < d.data.length; i += 4) {
      expect(d.data[i]).toBeGreaterThan(100);
      expect(d.data[i + 1]).toBeGreaterThan(100);
      expect(d.data[i + 2]).toBeGreaterThan(100);
    }
  });

  it('decreases brightness on all pixels when negative', () => {
    const d = makeFilledImageData(2, 2, 150, 150, 150);
    grayscaleBrightnessContrast(d, false, -50, 0);

    for (let i = 0; i < d.data.length; i += 4) {
      expect(d.data[i]).toBeLessThan(150);
      expect(d.data[i + 1]).toBeLessThan(150);
      expect(d.data[i + 2]).toBeLessThan(150);
    }
  });

  it('clamps brightness to [0, 255] at extremes', () => {
    const d = makeFilledImageData(2, 2, 10, 10, 10);
    grayscaleBrightnessContrast(d, false, -100, 0);

    for (let i = 0; i < d.data.length; i += 4) {
      expect(d.data[i]).toBe(0);
    }
  });

  it('increases contrast (pushes away from 128)', () => {
    const d = makeFilledImageData(2, 1, 64, 64, 64); // dark
    grayscaleBrightnessContrast(d, false, 0, 50);
    // Dark pixel should get darker
    expect(d.data[0]).toBeLessThan(64);

    const d2 = makeFilledImageData(2, 1, 192, 192, 192); // bright
    grayscaleBrightnessContrast(d2, false, 0, 50);
    // Bright pixel should get brighter
    expect(d2.data[0]).toBeGreaterThan(192);
  });

  it('decreases contrast (pushes toward 128)', () => {
    const d = makeFilledImageData(2, 1, 32, 32, 32); // very dark
    grayscaleBrightnessContrast(d, false, 0, -50);
    expect(d.data[0]).toBeGreaterThan(32);

    const d2 = makeFilledImageData(2, 1, 224, 224, 224); // very bright
    grayscaleBrightnessContrast(d2, false, 0, -50);
    expect(d2.data[0]).toBeLessThan(224);
  });

  it('preserves alpha channel', () => {
    const d = makeFilledImageData(2, 2, 128, 128, 128);
    d.data[3] = 200;
    d.data[7] = 100;
    d.data[11] = 50;

    grayscaleBrightnessContrast(d, true, 50, 0);

    expect(d.data[3]).toBe(200);
    expect(d.data[7]).toBe(100);
  });
});

// ── saturation ─────────────────────────────────────────────────

describe('saturation', () => {
  it('at 0% produces grayscale (R=G=B) output', () => {
    const d = makeFilledImageData(4, 4, 200, 50, 30);
    saturation(d, 0);

    for (let i = 0; i < d.data.length; i += 4) {
      const r = d.data[i];
      const g = d.data[i + 1];
      const b = d.data[i + 2];
      expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(r - b)).toBeLessThanOrEqual(1);
    }
  });

  it('at 100% preserves the original image', () => {
    const d = makeFilledImageData(4, 4, 120, 80, 200);
    const original = new Uint8ClampedArray(d.data);
    saturation(d, 100);

    for (let i = 0; i < d.data.length; i++) {
      expect(d.data[i]).toBe(original[i]);
    }
  });

  it('at 200% increases saturation on saturated pixels', () => {
    const d = makeFilledImageData(2, 2, 200, 50, 50);
    saturation(d, 200);

    for (let i = 0; i < d.data.length; i += 4) {
      expect(d.data[i]).toBeGreaterThanOrEqual(200);
      expect(d.data[i + 1]).toBeLessThanOrEqual(50);
    }
  });

  it('does not alter achromatic pixels', () => {
    const d = makeFilledImageData(3, 3, 128, 128, 128);
    saturation(d, 0);
    saturation(d, 200);

    for (let i = 0; i < d.data.length; i += 4) {
      expect(d.data[i]).toBe(128);
      expect(d.data[i + 1]).toBe(128);
      expect(d.data[i + 2]).toBe(128);
    }
  });

  it('preserves alpha channel', () => {
    const d = makeFilledImageData(2, 2, 100, 200, 50);
    d.data[3] = 77;
    d.data[7] = 88;

    saturation(d, 50);

    expect(d.data[3]).toBe(77);
    expect(d.data[7]).toBe(88);
  });
});

// ── floydSteinbergDither ──────────────────────────────────────

describe('floydSteinbergDither', () => {
  it('with intensity 0 is a no-op', () => {
    const d = makeFilledImageData(4, 4, 100, 100, 100);
    const original = new Uint8ClampedArray(d.data);
    floydSteinbergDither(d, 0);

    for (let i = 0; i < d.data.length; i++) {
      expect(d.data[i]).toBe(original[i]);
    }
  });

  it('with negative intensity is a no-op', () => {
    const d = makeFilledImageData(4, 4, 200, 200, 200);
    const original = new Uint8ClampedArray(d.data);
    floydSteinbergDither(d, -5);

    for (let i = 0; i < d.data.length; i++) {
      expect(d.data[i]).toBe(original[i]);
    }
  });

  it('at intensity 100 quantizes every pixel to 0 or 255', () => {
    const d = makeFilledImageData(8, 8, 150, 150, 150);
    floydSteinbergDither(d, 100);

    for (let i = 0; i < d.data.length; i += 4) {
      const r = d.data[i];
      expect([0, 255]).toContain(r);
      expect(d.data[i + 1]).toBe(r);
      expect(d.data[i + 2]).toBe(r);
    }
  });

  it('produces a mix of 0 and 255 values (not all one value)', () => {
    const d = makeFilledImageData(16, 16, 127, 127, 127);
    floydSteinbergDither(d, 100);

    let foundZero = false;
    let found255 = false;

    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] === 0) foundZero = true;
      if (d.data[i] === 255) found255 = true;
    }

    expect(foundZero).toBe(true);
    expect(found255).toBe(true);
  });

  it('preserves alpha channel', () => {
    const d = makeFilledImageData(4, 4, 128, 128, 128);
    d.data[3] = 99;
    d.data[7] = 44;

    floydSteinbergDither(d, 100);

    expect(d.data[3]).toBe(99);
    expect(d.data[7]).toBe(44);
  });

  it('at partial intensity still applies dithering', () => {
    const d = makeFilledImageData(8, 8, 128, 128, 128);
    floydSteinbergDither(d, 25);

    let changes = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] !== 128) changes++;
    }

    expect(changes).toBeGreaterThan(0);
  });
});

// ── extractRgbGrid ─────────────────────────────────────────────

describe('extractRgbGrid', () => {
  it('returns correct dimensions (rows × cols × 3)', () => {
    const canvas = createOffscreenCanvas(3, 2);

    const expectedData = makeFilledImageData(3, 2, 0, 0, 0);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = (row * 3 + col) * 4;
        expectedData.data[idx] = row * 50;
        expectedData.data[idx + 1] = col * 50;
        expectedData.data[idx + 2] = 100;
      }
    }

    const mockCtx = makeMockCtx(expectedData);
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as never);

    const grid = extractRgbGrid(canvas);

    expect(grid.length).toBe(2);
    expect(grid[0].length).toBe(3);
    expect(grid[0][0]).toEqual([0, 0, 100]);
    expect(grid[1][2]).toEqual([50, 100, 100]);
  });

  it('works for a 1×1 canvas', () => {
    const canvas = createOffscreenCanvas(1, 1);

    const expectedData = makeFilledImageData(1, 1, 42, 99, 200);
    const mockCtx = makeMockCtx(expectedData);
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as never);

    const grid = extractRgbGrid(canvas);

    expect(grid.length).toBe(1);
    expect(grid[0].length).toBe(1);
    expect(grid[0][0]).toEqual([42, 99, 200]);
  });
});

// ── applyFilters ───────────────────────────────────────────────

describe('applyFilters', () => {
  it('returns a canvas of the correct targetSize', () => {
    const source = createOffscreenCanvas(200, 200);
    const result = applyFilters(source, DEFAULT_FILTERS, 29);

    expect(result).toBeInstanceOf(HTMLCanvasElement);
    expect(result.width).toBe(29);
    expect(result.height).toBe(29);
  });

  it('returns a canvas with width === height === targetSize', () => {
    const source = createOffscreenCanvas(500, 300);
    const result = applyFilters(source, DEFAULT_FILTERS, 20);

    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
  });

  it('applies grayscale when grayscale is ON', () => {
    // We'll test black-box: applyFilters on a colored source should
    // produce greyscale output canvas. We mock getContext on the output
    // canvas prototype to capture the final ImageData.
    const stored = makeFilledImageData(4, 4, 200, 50, 30);

    // Since applyFilters creates a NEW canvas internally, we intercept
    // getContext on the prototype to return a mock that records putImageData.
    let capturedImageData: ImageData | null = null;
    const origGetContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = vi.fn(
      (_ctxId: string, _options?: unknown) => {
        return {
          drawImage: vi.fn(),
          getImageData: vi.fn(() => stored),
          putImageData: vi.fn((imgData: ImageData) => {
            capturedImageData = imgData;
          }),
        } as unknown as CanvasRenderingContext2D;
      },
    ) as typeof HTMLCanvasElement.prototype.getContext;

    try {
      const source = createOffscreenCanvas(4, 4);
      const params: FilterParams = {
        ...DEFAULT_FILTERS,
        grayscale: true,
        saturation: 100,
        dithering: false,
      };
      applyFilters(source, params, 4);

      expect(capturedImageData).not.toBeNull();
      const d = capturedImageData!;
      // First pixel should have R=G=B after grayscale
      expect(d.data[0]).toBe(d.data[1]);
      expect(d.data[1]).toBe(d.data[2]);
    } finally {
      HTMLCanvasElement.prototype.getContext = origGetContext;
    }
  });
});

// ── DEFAULT_FILTERS ────────────────────────────────────────────

describe('DEFAULT_FILTERS', () => {
  it('has grayscale enabled by default', () => {
    expect(DEFAULT_FILTERS.grayscale).toBe(true);
  });

  it('has brightness=0, contrast=0, saturation=100 (neutral)', () => {
    expect(DEFAULT_FILTERS.brightness).toBe(0);
    expect(DEFAULT_FILTERS.contrast).toBe(0);
    expect(DEFAULT_FILTERS.saturation).toBe(100);
  });

  it('has cropSize=0 (auto center square)', () => {
    expect(DEFAULT_FILTERS.cropSize).toBe(0);
  });

  it('has default gridSize=29', () => {
    expect(DEFAULT_FILTERS.gridSize).toBe(29);
  });

  it('has dithering disabled by default', () => {
    expect(DEFAULT_FILTERS.dithering).toBe(false);
    expect(DEFAULT_FILTERS.ditherIntensity).toBe(50);
  });
});

// ── Edge cases: crop handling in applyFilters ──────────────────

describe('applyFilters crop edge cases', () => {
  it('produces output of correct target size for auto-crop square source', () => {
    const source = createOffscreenCanvas(300, 300);
    const result = applyFilters(source, DEFAULT_FILTERS, 50);

    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  it('produces output of correct size for auto-crop rectangular source', () => {
    const source = createOffscreenCanvas(600, 400);
    const result = applyFilters(source, DEFAULT_FILTERS, 29);

    expect(result.width).toBe(29);
    expect(result.height).toBe(29);
  });

  it('does not crash with out-of-bounds crop and still returns valid output', () => {
    const source = createOffscreenCanvas(100, 100);

    const params: FilterParams = {
      ...DEFAULT_FILTERS,
      cropX: 200,
      cropY: -50,
      cropSize: 500,
    };

    const result = applyFilters(source, params, 10);

    expect(result).toBeInstanceOf(HTMLCanvasElement);
    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
  });

  it('auto-crop produces a square output even from tall source', () => {
    const source = createOffscreenCanvas(100, 300);
    const result = applyFilters(source, DEFAULT_FILTERS, 20);

    // Output is always square (targetSize × targetSize)
    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
  });

  it('auto-crop produces a square output even from wide source', () => {
    const source = createOffscreenCanvas(300, 100);
    const result = applyFilters(source, DEFAULT_FILTERS, 20);

    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
  });
});
