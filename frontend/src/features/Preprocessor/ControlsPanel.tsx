import { useCallback, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { RangeSlider } from '../../components/ui/RangeSlider/RangeSlider';
import { Button } from '../../components/ui/Button/Button';
import type { FilterParams } from '../../lib/image-preprocess';
import styles from './ControlsPanel.module.css';

interface Props {
  params: FilterParams;
  /** Smaller dimension of the source image, used for crop percent calc. */
  sourceMinDim: number;
  onChange: (params: FilterParams) => void;
  onReset: () => void;
  disabled?: boolean;
}

export default function ControlsPanel({
  params,
  sourceMinDim,
  onChange,
  onReset,
  disabled,
}: Props) {
  const update = useCallback(
    (patch: Partial<FilterParams>) => onChange({ ...params, ...patch }),
    [params, onChange],
  );

  const handleCheckbox = useCallback(
    (field: 'grayscale' | 'dithering') =>
      (e: ChangeEvent<HTMLInputElement>) => {
        update({ [field]: e.currentTarget.checked });
      },
    [update],
  );

  const handleCropPercent = useCallback(
    (pct: number) => {
      if (sourceMinDim <= 0) return;
      const size = Math.round((pct / 100) * sourceMinDim);
      update({ cropSize: Math.max(1, size) });
    },
    [sourceMinDim, update],
  );

  const cropPercent = useMemo(() => {
    if (sourceMinDim <= 0 || params.cropSize <= 0) return 100;
    return Math.round((params.cropSize / sourceMinDim) * 100);
  }, [sourceMinDim, params.cropSize]);

  return (
    <div className={styles.panel} role="region" aria-label="Image filters">
      {/* ── Color ─────────────────────────────── */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Color</legend>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={params.grayscale}
            onChange={handleCheckbox('grayscale')}
            disabled={disabled}
            className={styles.checkbox}
          />
          <span className={styles.toggleTrack} />
          <span className={styles.toggleLabel}>Grayscale</span>
        </label>

        <RangeSlider
          label={`Brightness: ${params.brightness}`}
          min={-100}
          max={100}
          value={params.brightness}
          onChange={(v) => update({ brightness: v })}
          disabled={disabled}
        />

        <RangeSlider
          label={`Contrast: ${params.contrast}`}
          min={-100}
          max={100}
          value={params.contrast}
          onChange={(v) => update({ contrast: v })}
          disabled={disabled}
        />

        <RangeSlider
          label={`Saturation: ${params.saturation}%`}
          min={0}
          max={200}
          value={params.saturation}
          onChange={(v) => update({ saturation: v })}
          disabled={disabled}
        />
      </fieldset>

      {/* ── Geometry ──────────────────────────── */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Geometry</legend>

        <RangeSlider
          label={`Crop size: ${cropPercent}%`}
          min={10}
          max={100}
          value={cropPercent}
          onChange={handleCropPercent}
          disabled={disabled || sourceMinDim <= 0}
        />

        <RangeSlider
          label={`Grid size: ${params.gridSize}×${params.gridSize}`}
          min={5}
          max={200}
          step={1}
          value={params.gridSize}
          onChange={(v) => update({ gridSize: v })}
          disabled={disabled}
        />
      </fieldset>

      {/* ── Dithering ─────────────────────────── */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Dithering</legend>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={params.dithering}
            onChange={handleCheckbox('dithering')}
            disabled={disabled}
            className={styles.checkbox}
          />
          <span className={styles.toggleTrack} />
          <span className={styles.toggleLabel}>Enable dithering</span>
        </label>

        {params.dithering && (
          <RangeSlider
            label={`Intensity: ${params.ditherIntensity}`}
            min={0}
            max={100}
            value={params.ditherIntensity}
            onChange={(v) => update({ ditherIntensity: v })}
            disabled={disabled}
          />
        )}
      </fieldset>

      {/* ── Reset ─────────────────────────────── */}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          type="button"
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
