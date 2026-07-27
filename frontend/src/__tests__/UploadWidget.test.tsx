import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProvider } from '../test/renderWithProvider';
import UploadWidget from '../features/UploadWidget/UploadWidget';

const noop = vi.fn();

// Tests ----------------------------------------------------------------------

describe('UploadWidget', () => {
  it('renders the empty state before any file is selected', () => {
    renderWithProvider(<UploadWidget onFileSelected={noop} />);
    expect(screen.getByText(/upload an image/i)).toBeTruthy();
  });

  it('drop zone shows upload prompt text', () => {
    renderWithProvider(<UploadWidget onFileSelected={noop} />);
    expect(screen.getByText(/drag.*drop/i)).toBeTruthy();
  });

  it('clicking the drop zone opens the file picker', () => {
    renderWithProvider(<UploadWidget onFileSelected={noop} />);
    const hiddenInput = document.querySelector('input[type="file"]');
    expect(hiddenInput).toBeTruthy();
  });

  it('calls onFileSelected when a file is dropped', () => {
    const onFileSelected = vi.fn();
    renderWithProvider(<UploadWidget onFileSelected={onFileSelected} />);

    const dropZone = screen.getByRole('button');
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('calls onFileSelected when a file is picked via input', () => {
    const onFileSelected = vi.fn();
    renderWithProvider(<UploadWidget onFileSelected={onFileSelected} />);

    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('applies active class on drag over', () => {
    renderWithProvider(<UploadWidget onFileSelected={noop} />);
    const dropZone = screen.getByRole('button');

    fireEvent.dragOver(dropZone);

    // The active class should be applied
    expect(dropZone.className).toContain('dropZoneActive');
  });

  it('removes active class on drag leave', () => {
    renderWithProvider(<UploadWidget onFileSelected={noop} />);
    const dropZone = screen.getByRole('button');

    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    expect(dropZone.className).not.toContain('dropZoneActive');
  });

  it('does not call onFileSelected for unsupported file types', () => {
    const onFileSelected = vi.fn();
    renderWithProvider(<UploadWidget onFileSelected={onFileSelected} />);

    const dropZone = screen.getByRole('button');
    const file = new File(['dummy'], 'test.gif', { type: 'image/gif' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
