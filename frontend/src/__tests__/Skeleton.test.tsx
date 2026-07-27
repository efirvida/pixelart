import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../components/feedback/Skeleton/Skeleton';

describe('Skeleton', () => {
  it('renders a pulsing placeholder', () => {
    const { container } = render(<Skeleton width="200px" height="20px" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders text variant with multiple lines', () => {
    const { container } = render(<Skeleton variant="text" count={3} />);
    const lines = container.querySelectorAll('[data-testid="skeleton-line"]');
    expect(lines).toHaveLength(3);
  });

  it('renders circle variant', () => {
    const { container } = render(<Skeleton variant="circle" width="48px" height="48px" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toBeInTheDocument();
  });
});
