import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../components/layout/Footer/Footer';

describe('Footer', () => {
  it('renders default copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/Pixel Art Editor/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders custom children', () => {
    render(
      <Footer>
        <span>Custom footer content</span>
      </Footer>,
    );
    expect(screen.getByText('Custom footer content')).toBeInTheDocument();
  });

  it('renders as a contentinfo landmark', () => {
    render(<Footer />);
    const contentinfo = screen.getByRole('contentinfo');
    expect(contentinfo).toBeInTheDocument();
  });
});
