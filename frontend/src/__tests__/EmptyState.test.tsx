import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../components/feedback/EmptyState/EmptyState';

describe('EmptyState', () => {
  it('renders icon and title', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">🎨</span>}
        title="No items yet"
        message="Create your first item to get started."
      />,
    );

    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('renders message text', () => {
    render(
      <EmptyState
        title="Nothing here"
        message="Try adding something new."
      />,
    );

    expect(screen.getByText('Try adding something new.')).toBeInTheDocument();
  });

  it('renders action slot and is clickable', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        message="No data."
        action={<button onClick={onClick}>Add Item</button>}
      />,
    );

    const actionBtn = screen.getByRole('button', { name: 'Add Item' });
    expect(actionBtn).toBeInTheDocument();

    await userEvent.click(actionBtn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
