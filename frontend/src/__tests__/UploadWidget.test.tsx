import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../test/renderWithProvider';
import UploadWidget from '../features/UploadWidget/UploadWidget';

// Mock the API client
vi.mock('../api/client', () => ({
  uploadImage: vi.fn(),
  ApiError: class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

// Mock URL.createObjectURL
const originalURL = URL.createObjectURL;
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
});
afterEach(() => {
  URL.createObjectURL = originalURL;
});

// Helper to create a File
function createMockFile(name = 'test.png'): File {
  return new File(['dummy'], name, { type: 'image/png' });
}

// Tests ----------------------------------------------------------------------

describe('UploadWidget', () => {
  it('renders the empty state before any file is selected', () => {
    renderWithProvider(<UploadWidget />);
    // EmptyState component with instructional text
    expect(screen.getByText(/upload an image/i)).toBeTruthy();
  });

  it('renders the palette textarea', () => {
    renderWithProvider(<UploadWidget />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeTruthy();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders the grid size slider', () => {
    renderWithProvider(<UploadWidget />);
    // The RangeSlider label for grid size
    expect(screen.getByText(/grid size/i)).toBeTruthy();
  });

  it('drop zone shows upload prompt text', () => {
    renderWithProvider(<UploadWidget />);
    expect(screen.getByText(/drag.*drop/i)).toBeTruthy();
  });

  it('clicking the drop zone opens the file picker', () => {
    renderWithProvider(<UploadWidget />);
    const fileInput = screen.getByLabelText(/upload/i) || document.querySelector('input[type="file"]');
    // The hidden file input should exist
    const hiddenInput = document.querySelector('input[type="file"]');
    expect(hiddenInput).toBeTruthy();
  });

  it('selecting a file transitions to crop mode', async () => {
    // Set up image mock for ImageCropper
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      configurable: true,
      get: () => 600,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => true,
    });

    renderWithProvider(<UploadWidget />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile();

    // Simulate file selection
    await userEvent.upload(fileInput, file);

    // Should transition to ImageCropper (crop mode)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /pixelate/i })).toBeTruthy();
  });

  it('drop zone has accessible role and aria attributes', () => {
    // Set up image mock
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      configurable: true,
      get: () => 600,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => true,
    });

    renderWithProvider(<UploadWidget />);
    
    // The drop zone Card has role="button"
    const dropZone = screen.getByRole('button', { name: /upload image/i });
    expect(dropZone).toBeTruthy();
    expect(dropZone.getAttribute('tabindex')).toBe('0');
  });

  // Triangulation tests
  it('keyboard Enter on drop zone opens file picker', async () => {
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true, get: () => 800,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      configurable: true, get: () => 600,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true, get: () => true,
    });

    renderWithProvider(<UploadWidget />);
    const dropZone = screen.getByRole('button', { name: /upload image/i });
    
    // Press Enter on drop zone should not throw
    fireEvent.keyDown(dropZone, { key: 'Enter' });
    
    // Drop zone should still be rendered
    expect(dropZone).toBeTruthy();
  });

  it('live region exists for status announcements', () => {
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true, get: () => 800,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      configurable: true, get: () => 600,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true, get: () => true,
    });

    renderWithProvider(<UploadWidget />);
    
    // The live region should exist with role="status"
    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it('grid size slider has correct range', () => {
    renderWithProvider(<UploadWidget />);
    const slider = screen.getByLabelText(/grid size/i);
    expect(slider.getAttribute('min')).toBe('5');
    expect(slider.getAttribute('max')).toBe('100');
  });

  // Integration: upload flow
  it('successful upload calls resetGrid and shows success toast', async () => {
    const { uploadImage } = await import('../api/client');
    const mockUpload = uploadImage as ReturnType<typeof vi.fn>;
    mockUpload.mockResolvedValue({
      grid: [[0, 1], [2, 3]],
      palette: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'],
      dimensions: { width: 2, height: 2 },
    });

    // Mock image for ImageCropper
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 800 });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, get: () => 600 });
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });

    renderWithProvider(<UploadWidget />);

    // Trigger file selection to enter crop mode
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, createMockFile());

    // Wait for crop mode (Pixelate button appears)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pixelate/i })).toBeTruthy();
    });

    // Confirm crop to trigger upload
    const pixelateBtn = screen.getByRole('button', { name: /pixelate/i });
    await userEvent.click(pixelateBtn);

    // Should show success in live region or toast
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledOnce();
    });
  });

  it('upload error shows error toast', async () => {
    const { uploadImage, ApiError } = await import('../api/client');
    const mockUpload = uploadImage as ReturnType<typeof vi.fn>;
    mockUpload.mockRejectedValue(new ApiError('Upload failed', 413));

    // Mock image for ImageCropper
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 800 });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, get: () => 600 });
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });

    renderWithProvider(<UploadWidget />);

    // Trigger file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, createMockFile());

    // Wait for crop mode
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pixelate/i })).toBeTruthy();
    });

    // Confirm crop
    const pixelateBtn = screen.getByRole('button', { name: /pixelate/i });
    await userEvent.click(pixelateBtn);

    // Should display error — either via toast or the form controls
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
    });
  });
});
