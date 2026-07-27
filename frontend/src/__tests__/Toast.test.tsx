import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../components/feedback/Toast/ToastProvider';
import type { ReactNode } from 'react';

/**
 * Test helper: component that exposes the toast API so tests can call it.
 */
function ToastConsumer({ onToast }: { onToast: (api: ReturnType<typeof useToast>) => void }) {
  const toast = useToast();
  onToast(toast);
  return <div data-testid="consumer">consumer</div>;
}

function renderToastTree(ui?: ReactNode) {
  let api: ReturnType<typeof useToast> | null = null;
  const result = render(
    <ToastProvider>
      <ToastConsumer onToast={(a) => { api = a; }} />
      {ui}
    </ToastProvider>,
  );
  return { ...result, getApi: () => api! };
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Variant rendering ---

  it('renders a success toast with green styling', async () => {
    const { getApi } = renderToastTree();
    await act(() => { getApi().success('Operation successful'); });

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    const toastEl = screen.getByRole('status');
    expect(toastEl).toHaveAttribute('aria-live', 'polite');
    expect(toastEl).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders an error toast with red styling', async () => {
    const { getApi } = renderToastTree();
    await act(() => { getApi().error('Something went wrong'); });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('renders an info toast with blue styling', async () => {
    const { getApi } = renderToastTree();
    await act(() => { getApi().info('Heads up'); });

    expect(screen.getByText('Heads up')).toBeInTheDocument();
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  // --- Auto-dismiss ---

  it('auto-dismisses a toast after 4000ms', async () => {
    const { getApi } = renderToastTree();
    await act(() => { getApi().success('Will disappear'); });

    expect(screen.getByText('Will disappear')).toBeInTheDocument();

    // Advance to just before 4000ms — toast should still be visible
    await act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.getByText('Will disappear')).toBeInTheDocument();

    // Advance past 4000ms — toast should be gone
    await act(() => { vi.advanceTimersByTime(1000); });
    await waitFor(() => {
      expect(screen.queryByText('Will disappear')).not.toBeInTheDocument();
    });
  });

  // --- Manual dismiss ---

  it('removes a toast when dismiss() is called with its id', async () => {
    const { getApi } = renderToastTree();
    let id: string;
    await act(() => { id = getApi().success('Dismiss me'); });

    expect(screen.getByText('Dismiss me')).toBeInTheDocument();

    await act(() => { getApi().dismiss(id); });
    await waitFor(() => {
      expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
    });
  });

  // --- Close button on each toast ---

  it('renders a close button that dismisses the toast', async () => {
    const { getApi } = renderToastTree();
    await act(() => { getApi().info('Closable'); });

    expect(screen.getByText('Closable')).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeInTheDocument();

    await userEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText('Closable')).not.toBeInTheDocument();
    });
  });

  // --- Multiple toasts stack ---

  it('renders multiple toasts simultaneously', async () => {
    const { getApi } = renderToastTree();
    await act(() => {
      getApi().success('First');
      getApi().error('Second');
      getApi().info('Third');
    });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();

    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(3);
  });

  // --- Provider renders children ---

  it('renders provider children', async () => {
    render(
      <ToastProvider>
        <p>Child content</p>
      </ToastProvider>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
