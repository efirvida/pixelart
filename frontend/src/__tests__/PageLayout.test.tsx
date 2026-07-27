import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLayout } from '../components/layout/PageLayout/PageLayout';

describe('PageLayout', () => {
  it('renders header slot content', () => {
    render(
      <PageLayout
        header={<h1>My App</h1>}
        footer={<p>Footer text</p>}
      >
        <p>Main content</p>
      </PageLayout>,
    );
    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('renders footer slot content', () => {
    render(
      <PageLayout
        header={<div>Header</div>}
        footer={<p>Footer text</p>}
      >
        <p>Main content</p>
      </PageLayout>,
    );
    expect(screen.getByText('Footer text')).toBeInTheDocument();
  });

  it('renders children in the content area', () => {
    render(
      <PageLayout
        header={<div>Header</div>}
        footer={<div>Footer</div>}
      >
        <p>Main content</p>
      </PageLayout>,
    );
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });
});
