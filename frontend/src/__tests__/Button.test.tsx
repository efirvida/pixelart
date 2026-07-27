import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Button } from '../components/ui/Button/Button';

describe('Button', () => {
  // --- Variant rendering ---

  it('renders with default variant (primary) and default size (md)', () => {
    render(<Button>Click Me</Button>);
    const btn = screen.getByRole('button', { name: 'Click Me' });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('renders primary variant with correct styles', () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole('button', { name: 'Primary' });
    expect(btn.className).toMatch(/primary/);
  });

  it('renders secondary variant with correct styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button', { name: 'Secondary' });
    expect(btn.className).toMatch(/secondary/);
  });

  it('renders ghost variant with correct styles', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button', { name: 'Ghost' });
    expect(btn.className).toMatch(/ghost/);
  });

  it('renders size sm', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn.className).toMatch(/sm/);
  });

  it('renders size lg', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button', { name: 'Large' });
    expect(btn.className).toMatch(/lg/);
  });

  // --- Disabled state ---

  it('disables clicks when disabled prop is set', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Nope' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies disabled attribute on the native button', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  // --- Loading state ---

  it('sets aria-busy when loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('disables button when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  // --- Ref forwarding ---

  it('forwards ref to the native button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Me</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Ref Me');
  });

  // --- className composition ---

  it('composes external className with internal classes', () => {
    render(<Button className="my-custom">Styled</Button>);
    const btn = screen.getByRole('button', { name: 'Styled' });
    expect(btn.className).toMatch(/my-custom/);
  });

  // --- Native props passing ---

  it('passes native button attributes through (type, form, etc.)', () => {
    render(<Button type="submit">Submit</Button>);
    const btn = screen.getByRole('button', { name: 'Submit' });
    expect(btn).toHaveAttribute('type', 'submit');
  });

  // --- Click handler ---

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
