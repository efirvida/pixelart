# Proposal: Frontend Professional Overhaul

## Intent

The React frontend works but is unprofessional: raw inline styles, no design system, monolithic components, missing loading/empty/error states, no accessibility, shallow tests. This change rebuilds the presentation layer into a maintainable, accessible, tested component architecture without touching the backend contract.

## Scope

### In Scope
- CSS Modules architecture + design tokens (color, spacing, typography, shadow, radius) as CSS custom properties
- Reusable UI primitives (Button, IconButton, Card, TextInput, TextArea, RangeSlider, Select, Modal, Toast, Spinner, Skeleton, EmptyState, ErrorBoundary)
- Layout system: PageLayout, Section, Toolbar, Header, Footer with responsive behavior
- Refactor the four feature components onto the design system
- Shared canvas-render module (de-duplicate GridEditor ↔ ComparisonSlider)
- Global polish: hover/active/focus/disabled states, transitions, micro-animations
- Accessibility: focus, ARIA, keyboard navigation, roles, live-region announcements, verified contrast
- Loading/empty/error states with skeletons/spinners and toasts
- App shell: meta tags, favicon, title, font loading, app-level ErrorBoundary
- Full Vitest + @testing-library coverage for new components and refactored features

### Out of Scope
- Backend changes (API contract unchanged)
- E2E tests (no Cypress/Playwright)
- Auth, i18n, dark-mode theme switching
- PWA / offline support
- Canvas rendering performance optimization
- Storybook / visual regression
- CI/CD pipeline changes

## Capabilities

> Contract for sdd-spec. Researched `openspec/specs/` (5 existing domains).

### New Capabilities
- `design-system`: design tokens via CSS custom properties, CSS Modules conventions, and the reusable UI primitive library (Button, Card, inputs, Modal, Toast, Spinner, Skeleton, EmptyState, ErrorBoundary)
- `app-shell`: responsive PageLayout/Section/Toolbar/Header/Footer, HTML head meta tags, favicon, font loading, app-level ErrorBoundary
- `accessibility`: cross-cutting requirements for focus management, ARIA semantics, keyboard navigation, live-region announcements, color-contrast verification

### Modified Capabilities
- `image-upload`: UploadWidget and ImageCropper rebuilt on the design system with loading/empty/error states, form-control primitives, and accessibility
- `preview-editor`: GridEditor and ComparisonSlider refactored onto the design system with shared canvas-render module, accessibility, consistent feedback states

## Approach

Tokens → primitive library → app-shell → feature refactors → tests, TDD strict. Deliverable work units map to chained PR slices to respect the 800-line review budget.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/styles/` | New | `tokens.css` + CSS Modules base |
| `src/components/ui/` | New | Reusable primitive library |
| `src/components/layout/` | New | PageLayout, Section, Toolbar, Header, Footer |
| `src/components/feedback/` | New | Toast, Skeleton, Spinner, EmptyState, ErrorBoundary |
| `src/features/UploadWidget/` | Modified | Refactor + a11y + loading states |
| `src/features/ImageCropper/` | Modified | Refactor + a11y |
| `src/features/ComparisonSlider/` | Modified | Refactor + shared canvas-render module |
| `src/features/GridEditor/` | Modified | Refactor + shared canvas-render module |
| `src/lib/canvas-render.ts` | New | Shared cell-rendering logic |
| `index.html` | Modified | Meta tags, favicon, title, font preconnect |
| `src/main.tsx` | Modified | ErrorBoundary wrapper |
| `src/test/` | Modified | New component + a11y tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Visual regressions in canvas grid/crop | Med | Keep render math unchanged; extract module without altering output; render tests |
| Scope creep into backend | Low | API client untouched; spec deltas forbid contract changes |
| Token churn destabilizes late refactor | Med | Lock tokens in slice 1; later slices consume, not redefine |
| A11y regressions | Med | Add a11y tests early; contrast checks in suite |
| Review budget exceeded | Med | Chained PR slices per work unit; each ≤800 lines |

## Rollback Plan

Each slice is a separate PR/commit; rollback = revert the slice. Tokens and primitives are additive (no existing API removed until features migrate in a later slice), so reverting any feature refactor restores the prior inline-style implementation. App-shell ErrorBoundary is additive; reverting restores the bare `<div>` root.

## Dependencies

- Vite CSS Modules support (built-in) — no new runtime deps
- Uses existing React 19, TypeScript, Vitest, @testing-library
- Backend API contract must stay stable (out-of-scope guarantee)

## Success Criteria

- [ ] Zero raw inline styles outside primitives; all UI via CSS Modules + tokens
- [ ] Primitive library covers all listed components with full variants
- [ ] Zero a11y violations: focus, ARIA, keyboard, contrast
- [ ] Loading/empty/error states present for upload, crop, export flows
- [ ] Shared canvas-render module eliminates GridEditor ↔ ComparisonSlider duplication
- [ ] Test coverage ≥ existing + all new components and refactored features; canvas rendering covered
- [ ] App shell has meta tags, favicon, title, font loading
- [ ] No backend contract changes; backend tests green
- [ ] Each PR slice within 800-line review budget