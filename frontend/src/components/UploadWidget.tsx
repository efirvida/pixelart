import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ApiError, uploadImage } from '../api/client';
import { useGrid } from '../context/GridContext';
import ImageCropper from './ImageCropper';

/** Map known HTTP status codes to user-friendly messages. */
const STATUS_MESSAGES: Record<number, string> = {
  413: 'The file is too large. Maximum size is 10 MB.',
  415: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.',
  422: 'Could not process the image. Make sure it is a valid raster file.',
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function UploadWidget() {
  const { resetGrid } = useGrid();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [palette, setPalette] = useState('#000000\n#404040\n#B0B0B0\n#FFFFFF');
  const [gridSize, setGridSize] = useState(29);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Flow: 'upload' → 'crop' → (API call) → 'result'
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const parsePalette = useCallback(
    (): string[] =>
      palette
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [palette],
  );

  /** Called when the user confirms the crop in ImageCropper. */
  const handleCropped = useCallback(
    async (cropped: File, cropX: number, cropY: number, cropSize: number) => {
      setLoading(true);
      setError(null);
      setPendingFile(null);
      try {
        const colors = parsePalette();
        if (colors.length === 0) throw new Error('Enter at least one palette colour.');

        const originalDataUrl = await readFileAsDataUrl(cropped);
        const data = await uploadImage(cropped, colors, gridSize, cropX, cropY, cropSize);
        resetGrid(data.grid, data.palette, originalDataUrl);
      } catch (err) {
        if (err instanceof ApiError) {
          const msg = STATUS_MESSAGES[err.status] ?? err.message;
          setError(msg);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    },
    [parsePalette, gridSize, resetGrid],
  );

  /** Called when user picks a file → show cropper. */
  const handleFileSelected = useCallback((file: File) => {
    setError(null);
    setPendingFile(file);
  }, []);

  // ---- Drag & drop handlers --------------------------------------------------
  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected],
  );

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected],
  );

  // ── Render ──────────────────────────────────────────────────────────

  // Crop step
  if (pendingFile) {
    return (
      <ImageCropper
        file={pendingFile}
        onConfirm={handleCropped}
        onBack={() => setPendingFile(null)}
      />
    );
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      {/* Drag zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#4f46e5' : '#aaa'}`,
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? '#eef2ff' : '#f9fafb',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        {loading ? (
          <p>Uploading…</p>
        ) : (
          <p>Drag & drop an image here, or click to browse</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Palette input */}
      <label style={{ display: 'block', marginTop: 16, fontWeight: 600 }}>
        Palette (one hex colour per line)
      </label>
      <textarea
        value={palette}
        onChange={(e) => setPalette(e.target.value)}
        rows={5}
        style={{ width: '100%', fontFamily: 'monospace', marginTop: 4 }}
      />

      {/* Grid size */}
      <label style={{ display: 'block', marginTop: 12, fontWeight: 600 }}>
        Grid size: {gridSize}×{gridSize}
      </label>
      <input
        type="range"
        min={5}
        max={100}
        value={gridSize}
        onChange={(e) => setGridSize(Number(e.target.value))}
        style={{ width: '100%' }}
      />

      {/* Error display */}
      {error && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
