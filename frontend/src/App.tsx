import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { exportPdf, downloadBlob, ApiError } from './api/client';
import ComparisonSlider from './components/ComparisonSlider';
import GridEditor from './components/GridEditor';
import UploadWidget from './components/UploadWidget';
import { GridProvider, useGrid } from './context/GridContext';

function EditorLayout() {
  const { grid, palette } = useGrid();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(5);

  const hasData = grid.length > 0 && grid[0].length > 0 && palette.length > 0;

  const handleExport = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setExporting(true);
      setExportError(null);
      try {
        const blob = await exportPdf({
          grid,
          palette,
          cell_size_mm: cellSize,
        });
        downloadBlob(blob);
      } catch (err) {
        if (err instanceof ApiError) {
          setExportError(err.message);
        } else if (err instanceof Error) {
          setExportError(err.message);
        } else {
          setExportError('Export failed.');
        }
      } finally {
        setExporting(false);
      }
    },
    [grid, palette, cellSize],
  );

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>
        PixelArt Reducer
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Upload a pre-cropped image, match it to your bead palette, tweak
        individual cells, then export a printable PDF.
      </p>

      <UploadWidget />

      {hasData && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 32,
              flexWrap: 'wrap',
            }}
          >
            <ComparisonSlider />
            <GridEditor />
          </div>

          <form
            onSubmit={handleExport}
            style={{ marginTop: 32, display: 'flex', gap: 12, alignItems: 'end' }}
          >
            <label>
              Cell size (mm):
              <input
                type="number"
                min={1}
                max={50}
                step={0.5}
                value={cellSize}
                onChange={(e) => setCellSize(Number(e.target.value))}
                style={{ marginLeft: 8, width: 80 }}
              />
            </label>
            <button
              type="submit"
              disabled={exporting}
              style={{
                padding: '8px 20px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {exporting ? 'Generating PDF…' : 'Download PDF'}
            </button>
            {exportError && (
              <span role="alert" style={{ color: '#b91c1c', fontSize: '0.875rem' }}>
                {exportError}
              </span>
            )}
          </form>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GridProvider>
      <EditorLayout />
    </GridProvider>
  );
}
