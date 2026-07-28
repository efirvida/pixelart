/** Typed fetch wrappers for the PixelArt backend API.
 *
 * The Vite dev server proxies ``/api/*`` → ``http://localhost:8000``,
 * so these calls work with bare paths during development.
 */

// ---- Shared types (mirrors backend Pydantic schemas) -----------------------

export interface Dimensions {
  width: number;
  height: number;
}

export interface UploadResponse {
  grid: number[][];
  palette: string[];
  dimensions: Dimensions;
}

export type ExportMode = 'grid-legend' | 'grid-table' | 'table-only';

export const EXPORT_MODE_LABELS: Record<ExportMode, string> = {
  'grid-legend': 'Grid + Legend',
  'grid-table': 'Grid + Table',
  'table-only': 'Color Table Only',
};

export const EXPORT_MODE_DESCRIPTIONS: Record<ExportMode, string> = {
  'grid-legend': 'Grid with color swatches and cell counts',
  'grid-table': 'Grid with coordinate reference grouped by color',
  'table-only': 'Only coordinates — hide the final image',
};

export interface ExportRequest {
  grid: number[][];
  palette: string[];
  cell_size_mm?: number;
  export_mode?: ExportMode;
}

// ---- Error type for structured error handling ------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** User-friendly message that can be shown directly in the UI. */
  static fromResponse(status: number, body: unknown): ApiError {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? String((body as Record<string, unknown>).detail)
        : `Request failed with status ${status}`;

    return new ApiError(detail, status);
  }
}

// ---- Upload ----------------------------------------------------------------

/**
 * Upload an image + palette to the backend.
 *
 * @param file      The raster image file (JPEG / PNG / WebP).
 * @param palette   Palette as an array of ``#RRGGBB`` hex strings.
 * @param gridSize  Target grid dimension (default 29).
 * @param cropX     Crop origin X in natural pixels (optional).
 * @param cropY     Crop origin Y in natural pixels (optional).
 * @param cropSize  Crop square side in natural pixels (0 = centre crop).
 * @returns         The matched grid, palette, and dimensions.
 */
export async function uploadImage(
  file: File,
  palette: string[],
  gridSize = 29,
  cropX = 0,
  cropY = 0,
  cropSize = 0,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('palette', JSON.stringify(palette));
  form.append('grid_size', String(gridSize));
  form.append('crop_x', String(cropX));
  form.append('crop_y', String(cropY));
  form.append('crop_size', String(cropSize));

  const res = await fetch('/api/upload', { method: 'POST', body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw ApiError.fromResponse(res.status, body);
  }

  return res.json() as Promise<UploadResponse>;
}

// ---- Match ----------------------------------------------------------------

/**
 * Send a pre-processed N×N RGB pixel grid to the backend for palette matching.
 *
 * The frontend handles all preprocessing (grayscale, brightness, contrast,
 * saturation, crop, resize). This endpoint only does CIELAB ΔE2000 matching.
 *
 * @param grid     N×N array of [R, G, B] triples, values 0–255.
 * @param palette  Array of "#RRGGBB" hex colour strings (max 10).
 * @returns        The matched grid indices, palette, and dimensions.
 */
export async function matchGrid(
  grid: number[][][],
  palette: string[],
): Promise<UploadResponse> {
  const res = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grid, palette }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw ApiError.fromResponse(res.status, body);
  }

  return res.json() as Promise<UploadResponse>;
}

// ---- Export ----------------------------------------------------------------

/**
 * Generate a PDF from the current grid state.
 *
 * @param payload  The grid, palette, and optional cell size in mm.
 * @returns        A Blob containing the PDF bytes.
 */
export async function exportPdf(payload: ExportRequest): Promise<Blob> {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw ApiError.fromResponse(res.status, body);
  }

  return res.blob();
}

/**
 * Convenience: trigger a browser file download of the generated PDF.
 */
export function downloadBlob(blob: Blob, filename = 'pixelart-grid.pdf'): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
