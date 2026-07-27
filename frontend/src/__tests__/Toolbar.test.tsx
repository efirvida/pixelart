import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toolbar } from '../components/layout/Toolbar/Toolbar';

describe('Toolbar', () => {
  it('renders children content', () => {
    render(
      <Toolbar>
        <button>Save</button>
        <button>Delete</button>
      </Toolbar>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
