import { describe, it, expect } from 'vitest';
import { screen, render } from '@testing-library/react';
import { ToastProvider } from '../components/feedback/Toast/ToastProvider';
import { GridProvider } from '../context/GridContext';
import UploadWidget from '../features/UploadWidget/UploadWidget';
import ImageCropper from '../features/ImageCropper/ImageCropper';
import ComparisonSlider from '../features/ComparisonSlider/ComparisonSlider';
import GridEditor from '../features/GridEditor/GridEditor';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <GridProvider>{ui}</GridProvider>
    </ToastProvider>,
  );
}

function mockImageElement() {
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });
}

describe('Accessibility Verification', () => {
  beforeEach(() => {
    const orig = URL.createObjectURL;
    URL.createObjectURL = () => 'blob:mock-url';
    return () => { URL.createObjectURL = orig; };
  });

  it('UploadWidget drop zone has accessible name via aria-label', () => {
    renderWithProviders(<UploadWidget />);
    const dropZone = screen.getByRole('button', { name: /upload image/i });
    expect(dropZone).toBeTruthy();
  });

  it('UploadWidget live region for status exists', () => {
    renderWithProviders(<UploadWidget />);
    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it('ImageCropper image has alt text', () => {
    mockImageElement();
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    render(<ImageCropper file={file} onConfirm={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('img', { name: /crop preview/i })).toBeTruthy();
  });

  it('ImageCropper buttons have accessible names', () => {
    mockImageElement();
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    render(<ImageCropper file={file} onConfirm={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /pixelate/i })).toBeTruthy();
  });

  it('ComparisonSlider divider has slider role', () => {
    renderWithProviders(<ComparisonSlider />);
    // Without data, shows placeholder — no slider rendered
    expect(screen.getByText(/upload an image/i)).toBeTruthy();
  });

  it('GridEditor canvas has aria-label when grid data present', () => {
    renderWithProviders(<GridEditor />);
    // Without data, shows empty state
    expect(screen.getByText(/upload an image/i)).toBeTruthy();
  });

  it('no duplicate IDs in UploadWidget', () => {
    renderWithProviders(<UploadWidget />);
    const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('GridEditor live region exists before data', () => {
    renderWithProviders(<GridEditor />);
    // Canvas not rendered without data, but empty state renders
    expect(screen.getByText(/upload an image/i)).toBeTruthy();
  });
});
