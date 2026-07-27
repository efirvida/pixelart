import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/layout/Header/Header';

describe('Header', () => {
  it('renders title text', () => {
    render(<Header title="Pixel Art Editor" />);
    expect(screen.getByText('Pixel Art Editor')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<Header title="My App" subtitle="Create amazing pixel art" />);
    expect(screen.getByText('Create amazing pixel art')).toBeInTheDocument();
  });

  it('renders children actions', () => {
    render(
      <Header title="App">
        <button>Settings</button>
      </Header>,
    );
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('renders as a banner landmark', () => {
    render(<Header title="App" />);
    const banner = screen.getByRole('banner');
    expect(banner).toBeInTheDocument();
  });
});
