import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { IconButton } from '../components/ui/IconButton/IconButton';

describe('IconButton', () => {
  // --- Basic rendering ---

  it('renders an icon child inside a button', () => {
    render(
      <IconButton aria-label="Close dialog">
        <span data-testid="icon">✕</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Close dialog' });
    expect(btn).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with default variant (primary)', () => {
    render(
      <IconButton aria-label="Add item">
        <span>+</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('applies variant class', () => {
    render(
      <IconButton aria-label="Delete" variant="ghost">
        <span>🗑</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/ghost/);
  });

  it('applies size class', () => {
    render(
      <IconButton aria-label="Zoom in" size="lg">
        <span>🔍</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Zoom in' });
    expect(btn.className).toMatch(/lg/);
  });

  // --- Disabled state ---

  it('disables interaction when disabled', async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Remove" disabled onClick={onClick}>
        <span>−</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Remove' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  // --- Ref forwarding ---

  it('forwards ref to the native button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton ref={ref} aria-label="Menu">
        <span>☰</span>
      </IconButton>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  // --- className composition ---

  it('composes external className', () => {
    render(
      <IconButton aria-label="Settings" className="toolbar-btn">
        <span>⚙</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Settings' });
    expect(btn.className).toMatch(/toolbar-btn/);
  });

  // --- Click handler ---

  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Undo" onClick={onClick}>
        <span>↩</span>
      </IconButton>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
