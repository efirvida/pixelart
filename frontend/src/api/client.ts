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

export interface ExportRequest {
  grid: number[][];
  palette: string[];
  cell_size_mm?: number;
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
