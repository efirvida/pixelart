import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ApiError, uploadImage } from '../../api/client';
import { useGrid } from '../../context/GridContext';
import { useToast } from '../../components/feedback/Toast/ToastProvider';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Spinner } from '../../components/feedback/Spinner/Spinner';
import { EmptyState } from '../../components/feedback/EmptyState/EmptyState';
import { TextArea } from '../../components/ui/TextArea/TextArea';
import { RangeSlider } from '../../components/ui/RangeSlider/RangeSlider';
import ImageCropper from '../ImageCropper/ImageCropper';
import styles from './UploadWidget.module.css';

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
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [palette, setPalette] = useState('#000000\n#404040\n#B0B0B0\n#FFFFFF');
  const [gridSize, setGridSize] = useState(29);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const parsePalette = useCallback(
    (): string[] =>
      palette
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [palette],
  );

  const handleCropped = useCallback(
    async (cropped: File, cropX: number, cropY: number, cropSize: number) => {
      setLoading(true);
      setStatusMessage('Uploading image…');
      setPendingFile(null);
      try {
        const colors = parsePalette();
        if (colors.length === 0) {
          toast.error('Enter at least one palette colour.');
          setStatusMessage('Upload failed: empty palette');
          return;
        }

        const originalDataUrl = await readFileAsDataUrl(cropped);
        const data = await uploadImage(cropped, colors, gridSize, cropX, cropY, cropSize);
        resetGrid(data.grid, data.palette, originalDataUrl);
        setStatusMessage('Upload complete');
        toast.success('Image uploaded successfully');
      } catch (err) {
        let msg = 'An unexpected error occurred.';
        if (err instanceof ApiError) {
          msg = STATUS_MESSAGES[err.status] ?? err.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setStatusMessage(`Upload failed: ${msg}`);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [parsePalette, gridSize, resetGrid, toast],
  );

  const handleFileSelected = useCallback((file: File) => {
    setPendingFile(file);
  }, []);

  // ── Drag & drop ────────────────────────────────────────────────

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

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ── Crop mode ──────────────────────────────────────────────────

  if (pendingFile) {
    return (
      <ImageCropper
        file={pendingFile}
        onConfirm={handleCropped}
        onBack={() => setPendingFile(null)}
      />
    );
  }

  // ── Upload mode ────────────────────────────────────────────────

  const uploadIcon = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );

  return (
    <div className={styles.container}>
      {/* Status live region */}
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>

      {/* Drop zone */}
      <Card
        className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload image — drag and drop or click to browse"
        aria-busy={loading ? 'true' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
      >
        <div onClick={openFilePicker} className={styles.dropContent}>
          {loading ? (
            <div className={styles.loadingState}>
              <Spinner size="lg" label="Uploading" />
              <p className={styles.loadingText}>Uploading…</p>
            </div>
          ) : (
            <EmptyState
              icon={uploadIcon}
              title="Upload an Image"
              message="Drag & drop an image here, or click to browse"
            />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className={styles.hiddenInput}
          aria-hidden="true"
        />
      </Card>

      {/* Palette input */}
      <TextArea
        label="Palette (one hex colour per line)"
        value={palette}
        onChange={(e) => setPalette(e.target.value)}
        rows={5}
        id="palette-input"
      />

      {/* Grid size */}
      <RangeSlider
        label={`Grid size: ${gridSize}×${gridSize}`}
        min={5}
        max={100}
        value={gridSize}
        onChange={(v) => setGridSize(v)}
      />
    </div>
  );
}
