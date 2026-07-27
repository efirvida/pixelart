import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Card } from '../components/ui/Card/Card';

describe('Card', () => {
  it('renders children inside the card', () => {
    render(
      <Card>
        <p data-testid="content">Hello world</p>
      </Card>,
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toHaveTextContent('Hello world');
  });

  it('renders with default elevation (md)', () => {
    render(<Card>content</Card>);
    const card = screen.getByText('content').closest('div');
    expect(card).toBeInTheDocument();
  });

  it('applies elevation sm class', () => {
    render(<Card elevation="sm">Low</Card>);
    const el = screen.getByText('Low');
    expect(el.className).toMatch(/sm/);
  });

  it('applies elevation md class', () => {
    render(<Card elevation="md">Medium</Card>);
    const el = screen.getByText('Medium');
    expect(el.className).toMatch(/md/);
  });

  it('applies elevation lg class', () => {
    render(<Card elevation="lg">High</Card>);
    const el = screen.getByText('High');
    expect(el.className).toMatch(/lg/);
  });

  it('applies padding sm class', () => {
    render(<Card padding="sm">Tight</Card>);
    const el = screen.getByText('Tight');
    expect(el.className).toMatch(/paddingSm/);
  });

  it('applies padding md class (default)', () => {
    render(<Card padding="md">Normal</Card>);
    const el = screen.getByText('Normal');
    expect(el.className).toMatch(/paddingMd/);
  });

  it('applies padding lg class', () => {
    render(<Card padding="lg">Spacious</Card>);
    const el = screen.getByText('Spacious');
    expect(el.className).toMatch(/paddingLg/);
  });

  it('composes external className', () => {
    render(<Card className="my-card">Extra</Card>);
    const el = screen.getByText('Extra');
    expect(el.className).toMatch(/my-card/);
  });

  it('forwards ref to the wrapper div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.textContent).toBe('Ref Card');
  });
});
