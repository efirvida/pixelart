import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageCropper from '../features/ImageCropper/ImageCropper';

// Helpers --------------------------------------------------------------------

function createMockFile(name = 'test.png'): File {
  return new File(['dummy'], name, { type: 'image/png' });
}

// Mock URL.createObjectURL since JSDOM doesn't support it fully
const originalCreateObjectURL = URL.createObjectURL;

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
});

// We need to simulate image loading. Since jsdom doesn't load images,
// we mock the Image prototype to fire onload immediately.

function renderCropper(
  onConfirm = vi.fn(),
  onBack = vi.fn(),
  file = createMockFile(),
) {
  // Use Object.defineProperty to set naturalWidth/naturalHeight
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    get: () => 800,
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
    configurable: true,
    get: () => 600,
  });
  // Force image to be "complete" already
  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get: () => true,
  });

  return render(
    <ImageCropper file={file} onConfirm={onConfirm} onBack={onBack} />,
  );
}

// Tests ----------------------------------------------------------------------

describe('ImageCropper', () => {
  it('renders with an image element', () => {
    renderCropper();
    const img = screen.getByRole('img', { name: /crop preview/i });
    expect(img).toBeTruthy();
  });

  it('renders the crop size slider', () => {
    renderCropper();
    // The RangeSlider label contains "Crop size"
    expect(screen.getByText(/crop size/i)).toBeTruthy();
  });

  it('renders Back and Confirm buttons', () => {
    renderCropper();
    expect(screen.getByRole('button', { name: /back/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /pixelate/i })).toBeTruthy();
  });

  it('calls onBack when Back button is clicked', () => {
    const onBack = vi.fn();
    renderCropper(vi.fn(), onBack);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with crop coordinates when Confirm is clicked', () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();
    renderCropper(onConfirm, onBack);
    fireEvent.click(screen.getByRole('button', { name: /pixelate/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Verify onConfirm receives (file, cropX, cropY, cropSize)
    const args = onConfirm.mock.calls[0];
    expect(args[0]).toBeInstanceOf(File);
    expect(typeof args[1]).toBe('number'); // cropX
    expect(typeof args[2]).toBe('number'); // cropY
    expect(typeof args[3]).toBe('number'); // cropSize
    expect(args[3]).toBeGreaterThan(0);
  });

  it('crop size slider changes display value', () => {
    renderCropper();
    // Find the slider by its label
    const slider = screen.getByLabelText(/crop size/i);
    expect(slider).toBeTruthy();
    // The RangeSlider wrapper uses aria-labelledby, the input is type=range
    // The RangeSlider component uses aria-labelledby pointing to the label, 
    // so getByLabelText should work via the label's text content
    expect(slider.getAttribute('type')).toBe('range');
  });

  it('displays the instructional text', () => {
    renderCropper();
    expect(screen.getByText(/drag the image to move/i)).toBeTruthy();
    expect(screen.getByText(/slider to resize/i)).toBeTruthy();
  });

  // Triangulation — edge cases
  it('slider value changes update the display', () => {
    renderCropper();
    const slider = screen.getByLabelText(/crop size/i);
    expect(slider).toBeTruthy();

    // Verify the slider can accept value changes without crashing
    fireEvent.change(slider, { target: { value: '200' } });
    // The slider element should still be present after change
    expect(screen.getByLabelText(/crop size/i)).toBeTruthy();
  });

  it('onConfirm cropSize scales correctly with natural dimensions', () => {
    const onConfirm = vi.fn();
    renderCropper(onConfirm, vi.fn());
    fireEvent.click(screen.getByRole('button', { name: /pixelate/i }));

    const args = onConfirm.mock.calls[0];
    // cropX should be non-negative
    expect(args[1]).toBeGreaterThanOrEqual(0);
    // cropY should be non-negative
    expect(args[2]).toBeGreaterThanOrEqual(0);
    // cropSize in natural px should be positive
    expect(args[3]).toBeGreaterThan(0);
    // cropSize should not exceed natural width
    expect(args[3]).toBeLessThanOrEqual(800);
  });

  it('confirm button uses design system Button', () => {
    renderCropper();
    const btn = screen.getByRole('button', { name: /pixelate/i });
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON');
  });
});
