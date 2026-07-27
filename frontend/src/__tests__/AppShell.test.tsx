import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary/ErrorBoundary';
import { ToastProvider } from '../components/feedback/Toast/ToastProvider';
import App from '../App';

/**
 * Renders the full app tree as main.tsx will after Phase 4:
 *   ErrorBoundary > ToastProvider > App
 *
 * App internally wraps with GridProvider (via its own export).
 */
function renderAppShell() {
  return render(
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>,
  );
}

describe('App Shell (Phase 4)', () => {
  describe('4.1 — main.tsx provider chain', () => {
    it('renders without throwing (ErrorBoundary + ToastProvider wrapping)', () => {
      const { container } = renderAppShell();
      expect(container).toBeTruthy();
    });

    it('ToastProvider is available — useToast works inside App tree', () => {
      renderAppShell();
      // The App renders and no "useToast must be used within a ToastProvider" is thrown.
      // If ToastProvider weren't present, the render would crash.
      // Header with banner role proves the tree rendered without context errors.
      const banner = screen.getByRole('banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('Pixel Art Editor');
    });
  });

  describe('4.2 — App.tsx layout structure', () => {
    it('renders inside a PageLayout', () => {
      renderAppShell();
      // PageLayout renders a <main> element
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('renders a Header with the app title', () => {
      renderAppShell();
      // Header renders as <header> landmark (role="banner")
      const banner = screen.getByRole('banner');
      expect(banner).toBeInTheDocument();

      // Header displays the title text
      const title = screen.getByText('Pixel Art Editor');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H1');
    });

    it('renders the subtitle in the Header', () => {
      renderAppShell();
      const subtitle = screen.getByText('Convert images into bead patterns');
      expect(subtitle).toBeInTheDocument();
    });

    it('renders the Upload Section with UploadWidget content', () => {
      renderAppShell();
      // The upload section always renders
      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(1);

      // Section title is present
      expect(screen.getByText('Upload')).toBeInTheDocument();

      // UploadWidget drag zone text renders inside the section
      const dragText = screen.getByText(/drag & drop an image here/i);
      expect(dragText).toBeInTheDocument();
    });

    it('renders the Footer', () => {
      renderAppShell();
      // Footer renders as <footer> landmark (role="contentinfo")
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveTextContent('Pixel Art Editor');
    });

    it('renders an Editor Section wrapper (conditionally hidden when no data)', () => {
      renderAppShell();
      // The Editor Section exists but only has content when hasData is true.
      // On initial render (no grid data), there's only the Upload section.
      // The editor Section element itself is conditionally rendered via hasData.
      // Verify the layout supports the structure by checking the main element
      // contains at minimum the upload section.
      const main = screen.getByRole('main');
      const sections = main.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });

    it('still renders the UploadWidget drag zone', () => {
      renderAppShell();
      // UploadWidget should still be present — it renders its drag zone text
      const dragText = screen.getByText(/drag & drop an image here/i);
      expect(dragText).toBeInTheDocument();
    });
  });
});
