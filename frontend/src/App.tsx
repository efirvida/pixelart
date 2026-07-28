import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import {
  exportPdf,
  downloadBlob,
  ApiError,
  EXPORT_MODE_LABELS,
  EXPORT_MODE_DESCRIPTIONS,
} from './api/client';
import type { ExportMode } from './api/client';
import ComparisonSlider from './features/ComparisonSlider/ComparisonSlider';
import GridEditor from './features/GridEditor/GridEditor';
import Preprocessor from './features/Preprocessor/Preprocessor';
import UploadWidget from './features/UploadWidget/UploadWidget';
import { GridProvider, useGrid } from './context/GridContext';
import { PageLayout } from './components/layout/PageLayout/PageLayout';
import { Header } from './components/layout/Header/Header';
import { Section } from './components/layout/Section/Section';
import { Footer } from './components/layout/Footer/Footer';
import { Button } from './components/ui/Button/Button';
import styles from './App.module.css';

function EditorLayout() {
  const { grid, palette } = useGrid();
  const [file, setFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(5);
  const [exportMode, setExportMode] = useState<ExportMode>('grid-legend');

  const hasData = grid.length > 0 && grid[0].length > 0 && palette.length > 0;

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
  }, []);

  const handleBackFromPreprocessor = useCallback(() => {
    setFile(null);
  }, []);

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
          export_mode: exportMode,
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
    [grid, palette, cellSize, exportMode],
  );

  return (
    <PageLayout
      header={
        <Header
          title="Pixel Art Editor"
          subtitle="Convert images into bead patterns"
        />
      }
      footer={<Footer />}
    >
      {/*
       * CRITICAL: El Preprocessor debe estar SIEMPRE en la misma posición
       * del árbol DOM. Si React lo mueve (desmontar de A, montar en B),
       * el cleanup revoca el blob URL y el nuevo no puede cargar la imagen.
       *
       * El workspace se renderiza cuando hay file O hasData. El Preprocessor
       * está siempre dentro de workspaceLeft cuando file es truthy.
       * workspaceRight (Editor) se oculta con CSS cuando no hay datos.
       */}
      {!file && !hasData && (
        <Section title="Upload">
          <UploadWidget onFileSelected={handleFileSelected} />
        </Section>
      )}

      {(file || hasData) && (
        <div className={`${styles.workspace}${!hasData ? ` ${styles.workspacePreprocessorOnly}` : ''}`}>
          <div className={styles.workspaceLeft}>
            {file ? (
              <Preprocessor
                key="main-preprocessor"
                file={file}
                onBack={handleBackFromPreprocessor}
              />
            ) : (
              <Section title="Upload">
                <UploadWidget onFileSelected={handleFileSelected} />
              </Section>
            )}
          </div>

          {hasData && (
            <div className={styles.workspaceRight}>
              <Section title="Editor">
                <div className={styles.editorLayout}>
                  <ComparisonSlider />
                  <GridEditor />
                </div>

                <form onSubmit={handleExport} className={styles.exportForm}>
                  <div className={styles.exportModeGroup}>
                    {(Object.keys(EXPORT_MODE_LABELS) as ExportMode[]).map(
                      (mode) => (
                        <label key={mode} className={styles.exportModeOption}>
                          <input
                            type="radio"
                            name="exportMode"
                            value={mode}
                            checked={exportMode === mode}
                            onChange={() => setExportMode(mode)}
                          />
                          <span className={styles.exportModeLabel}>
                            {EXPORT_MODE_LABELS[mode]}
                          </span>
                          <span className={styles.exportModeDesc}>
                            {EXPORT_MODE_DESCRIPTIONS[mode]}
                          </span>
                        </label>
                      ),
                    )}
                  </div>

                  <div className={styles.exportControls}>
                    <label className={styles.exportLabel}>
                      Cell size (mm)
                      <input
                        type="number"
                        min={1}
                        max={50}
                        step={0.5}
                        value={cellSize}
                        onChange={(e) => setCellSize(Number(e.target.value))}
                        className={styles.cellSizeInput}
                      />
                    </label>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={exporting}
                      loading={exporting}
                    >
                      {exporting ? 'Generating PDF…' : 'Download PDF'}
                    </Button>
                  </div>

                  {exportError && (
                    <span role="alert" className={styles.exportError}>
                      {exportError}
                    </span>
                  )}
                </form>
              </Section>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

export default function App() {
  return (
    <GridProvider>
      <EditorLayout />
    </GridProvider>
  );
}
