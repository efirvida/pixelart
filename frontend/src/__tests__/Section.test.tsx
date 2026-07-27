import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Section } from '../components/layout/Section/Section';

describe('Section', () => {
  it('renders title when provided', () => {
    render(
      <Section title="Upload Image">
        <p>Content here</p>
      </Section>,
    );
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Section>
        <p data-testid="section-content">Hello section</p>
      </Section>,
    );
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('renders without title', () => {
    const { container } = render(
      <Section>
        <span>No title</span>
      </Section>,
    );
    expect(screen.getByText('No title')).toBeInTheDocument();
  });
});
