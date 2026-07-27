import { describe, it, expect } from 'vitest';

// ============================================================================
// WCAG 2.1 Contrast Ratio — computed from tokens.css hard-coded hex values
// ============================================================================

type RGB = { r: number; g: number; b: number };

/**
 * Parse a hex color string into RGB components.
 */
function hexToRGB(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Linearize an sRGB channel value (0–255) for luminance calculation.
 */
function linearize(channel8bit: number): number {
  const v = channel8bit / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/**
 * Compute WCAG 2.1 relative luminance from RGB values.
 *
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Compute WCAG 2.1 contrast ratio between two hex colors.
 *
 * Returns a value between 1:1 (identical) and 21:1 (black/white).
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRGB(hex1));
  const l2 = relativeLuminance(hexToRGB(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// Token color values (hard-coded from tokens.css — NOT computed at runtime)
// ============================================================================
const TOKENS = {
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  primaryActive: '#3730a3',
  primaryContrast: '#ffffff',
  accent: '#f59e0b',
  accentHover: '#d97706',
  accentActive: '#b45309',
  accentContrast: '#1f2937',
  surfaceBase: '#f9fafb',
  surfaceRaised: '#ffffff',
  surfaceOverlay: 'rgba(0, 0, 0, 0.5)',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textDisabled: '#9ca3af',
  error: '#dc2626',
  errorHover: '#b91c1c',
  success: '#16a34a',
  successHover: '#15803d',
} as const;

type ContrastPair = {
  label: string;
  foreground: string;
  background: string;
  minNormalText: number; // WCAG AA normal text: ≥4.5:1
  minLargeText: number; // WCAG AA large text / UI components: ≥3:1
};

const PAIRS: ContrastPair[] = [
  // Task 4.3: primary on surface, text on surface, error on surface, white on primary
  {
    label: 'primary on surface-raised',
    foreground: TOKENS.primary,
    background: TOKENS.surfaceRaised,
    minNormalText: 4.5,
    minLargeText: 3.0,
  },
  {
    label: 'text-primary on surface-raised',
    foreground: TOKENS.textPrimary,
    background: TOKENS.surfaceRaised,
    minNormalText: 4.5,
    minLargeText: 3.0,
  },
  {
    label: 'error on surface-raised',
    foreground: TOKENS.error,
    background: TOKENS.surfaceRaised,
    minNormalText: 4.5,
    minLargeText: 3.0,
  },
  {
    label: 'white (primary-contrast) on primary',
    foreground: TOKENS.primaryContrast,
    background: TOKENS.primary,
    minNormalText: 4.5,
    minLargeText: 3.0,
  },
];

describe('WCAG 2.1 Contrast Ratio', () => {
  describe('helper functions', () => {
    it('hexToRGB parses colors correctly', () => {
      expect(hexToRGB('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRGB('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRGB('#4f46e5')).toEqual({ r: 79, g: 70, b: 229 });
    });

    it('contrastRatio black on white is 21:1', () => {
      const ratio = contrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('contrastRatio same color is 1:1', () => {
      const ratio = contrastRatio('#4f46e5', '#4f46e5');
      expect(ratio).toBeCloseTo(1, 0);
    });
  });

  describe.each(PAIRS)(
    '$label — $foreground on $background',
    ({ foreground, background, minNormalText, minLargeText }) => {
      const ratio = contrastRatio(foreground, background);
      const rounded = Math.round(ratio * 100) / 100;

      it(`contrast ratio ${rounded}:1 meets WCAG AA normal text (≥${minNormalText}:1)`, () => {
        expect(ratio).toBeGreaterThanOrEqual(minNormalText);
      });

      it(`contrast ratio ${rounded}:1 meets WCAG AA large text / UI (≥${minLargeText}:1)`, () => {
        expect(ratio).toBeGreaterThanOrEqual(minLargeText);
      });
    },
  );
});
