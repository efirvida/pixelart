# Tasks: Frontend Professional Overhaul

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,500–4,500 (23 new + 4 modified + 4 deleted) |
| 400-line budget risk | High |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 5 stacked PRs (one per implementation phase) |
| Delivery strategy | single-pr (session config) — conflicts with scope |
| Chain strategy | stacked-to-main |

Decision needed before apply: **Yes** — session config says `single-pr` but the proposal and design explicitly require chained PR slices (each ≤800 lines). The orchestrator must resolve this conflict before sdd-apply.

Chained PRs recommended: **Yes**

Chain strategy: **stacked-to-main** — each phase builds on the previous, each ≤800 lines, only the final phase touches features that replace flat components.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation: tokens.css + global.css + index.html meta | PR 1 → main | `npm run test tokens` | N/A (styles only) | Drop tokens.css; no consumer code affected |
| 2 | Primitives: all 8 ui/ components + tests | PR 2 → main | `npm run test -- --run src/components/ui/` | Dev server, verify primitives render | Delete ui/ dir; no consumer code yet |
| 3 | Feedback + Layout: feedback components, layout components + tests | PR 3 → main | `npm run test -- --run "src/components/(feedback|layout)/"` | Dev server, verify layout shell | Delete feedback/ + layout/ dirs |
| 4 | Feature shell: canvas-render.ts + App.tsx/main.tsx refactor + ToastProvider wiring | PR 4 → main | `npm run test -- --run src/lib/ src/features/` | Dev server, smoke-test full app | Revert App.tsx/main.tsx; features still use flat components |
| 5 | Feature refactors: UploadWidget + ImageCropper + ComparisonSlider + GridEditor with tests | PR 5 → main | `npm run test -- --run src/features/` | Full app; upload flow end-to-end | Delete features/; restore flat components |

---

## Phase 1: Foundation (PR 1)

- [x] 1.1 Create `frontend/src/styles/tokens.css` with CSS custom properties: color (primary/accent/surface/text/error/success + hover/active variants), spacing (--space-1 through --space-8), typography (font-family, h1–h4, body sm/md/lg, weights), shadows (elevation-1, elevation-2), radii (sm/md/lg/full)
- [x] 1.2 Create `frontend/src/styles/global.css` importing tokens.css, add CSS reset, base typography rules using tokens
- [x] 1.3 Update `frontend/index.html`: add `<title>Pixel Art Editor</title>`, `<meta name="description">`, `<meta name="viewport">`, `<link rel="icon">`, font `<link rel="preconnect">` if external fonts
- [x] 1.4 Create `frontend/src/lib/canvas-render.ts` with `computeCellBounds()`, `renderGridCells()`, `hitTestCell()` — pure functions with typed interfaces `RenderBounds` and `CellBounds`
- [x] 1.5 Write unit tests for `canvas-render.ts`: mock `CanvasRenderingContext2D`, verify `computeCellBounds` math and `hitTestCell` edge cases (out-of-bounds, boundary cells)
- [x] 1.6 Update `frontend/src/test/renderWithProvider.tsx` to wrap with `ToastProvider` (needed for Phase 2+ test compatibility)

**Phase 1 test command**: `npm run test -- --run src/lib/canvas-render.test.ts`

---

## Phase 2: UI Primitives Library (PR 2)

All components use `forwardRef` + `displayName`, accept `className` prop, consume tokens via CSS Modules.

- [x] 2.1 Create `Button/Button.tsx` + `Button.module.css` — primary/secondary/ghost variants, hover/active/disabled/focus-visible states
- [x] 2.2 Write tests for Button: render all variants, disabled prevents clicks, ref forwarded to button element
- [x] 2.3 Create `IconButton/IconButton.tsx` + `IconButton.module.css` — icon-only, requires `aria-label`, same state variants as Button
- [x] 2.4 Write tests for IconButton: renders icon child, aria-label required
- [x] 2.5 Create `Card/Card.tsx` + `Card.module.css` — elevation via shadow tokens, accepts `className` for composition
- [x] 2.6 Write tests for Card: renders children, className composed
- [x] 2.7 Create `TextInput/TextInput.tsx` + `TextInput.module.css` — label, input, error message, `aria-invalid` + `aria-describedby` on error, forwardRef
- [x] 2.8 Write tests for TextInput: renders label/input/error, aria-invalid when error present
- [x] 2.9 Create `TextArea/TextArea.tsx` + `TextArea.module.css` — multi-line, label, forwardRef
- [x] 2.10 Write tests for TextArea: renders with label, accepts value
- [x] 2.11 Create `RangeSlider/RangeSlider.tsx` + `RangeSlider.module.css` — `role="slider"`, `aria-valuemin/max/now`, keyboard Left/Right, forwardRef
- [x] 2.12 Write tests for RangeSlider: renders, ARIA attrs present, keyboard arrow keys update value
- [x] 2.13 Create `Select/Select.tsx` + `Select.module.css` — native select wrapper, label, forwardRef
- [x] 2.14 Write tests for Select: renders with label and options
- [x] 2.15 Create `Modal/Modal.tsx` + `Modal.module.css` — React Portal, focus trap (Tab cycles within), Escape closes, focus returns to trigger, forwardRef
- [x] 2.16 Write tests for Modal: opens/closes, focus trapped, Escape closes, focus restored to trigger

**Phase 2 test command**: `npm run test -- --run src/components/ui/`

---

## Phase 3: Layout + Feedback (PR 3)

- [x] 3.1 Create `Toast/Toast.tsx` + `Toast.module.css` + `ToastProvider.tsx` — Context + imperative `useToast()` hook, `success/error/info/dismiss` API, auto-dismiss default 4000ms
- [x] 3.2 Write tests for Toast: render variants, auto-dismiss fires, dismiss() removes toast, provider renders children
- [x] 3.3 Create `Spinner/Spinner.tsx` + `Spinner.module.css` — CSS-only, `role="status"`, `aria-label`
- [x] 3.4 Write tests for Spinner: role=status present
- [x] 3.5 Create `Skeleton/Skeleton.tsx` + `Skeleton.module.css` — pulsing placeholder rectangles
- [x] 3.6 Write tests for Skeleton: renders pulsing placeholder
- [x] 3.7 Create `EmptyState/EmptyState.tsx` + `EmptyState.module.css` — icon + message + optional action slot
- [x] 3.8 Write tests for EmptyState: renders icon and message, action slot clickable
- [x] 3.9 Create `ErrorBoundary/ErrorBoundary.tsx` + `ErrorBoundary.module.css` — class component, catches render errors, fallback with error message + "Reload" button, `componentDidCatch` + `console.error`
- [x] 3.10 Write tests for ErrorBoundary: `jest.spyOn(console, 'error')`, child throws → fallback renders, "Reload" button resets
- [x] 3.11 Create `PageLayout/PageLayout.tsx` + `PageLayout.module.css` — CSS Grid shell, mobile stack (<768px) / desktop side-by-side, slots for Header/Section(s)/Footer
- [x] 3.12 Create `Section/Section.tsx` + `Section.module.css` — content section with title slot
- [x] 3.13 Create `Toolbar/Toolbar.tsx` + `Toolbar.module.css` — horizontal actions, collapse to icons <768px with tooltips
- [x] 3.14 Create `Header/Header.tsx` + `Header.module.css` — app title
- [x] 3.15 Create `Footer/Footer.tsx` + `Footer.module.css` — app footer
- [x] 3.16 Write layout tests: PageLayout responsive breakpoints, Toolbar collapse, each component renders slot content

**Phase 3 test command**: `npm run test -- --run "src/components/(feedback|layout)/"`

---

## Phase 4: App Shell Wiring + Feature Shell (PR 4)

- [x] 4.1 Modify `frontend/src/main.tsx` — import `global.css` and `ErrorBoundary`, wrap root with `ErrorBoundary` then `ToastProvider` then `GridProvider`
- [x] 4.2 Modify `frontend/src/App.tsx` — replace current structure with `PageLayout` containing `Header`, `Section(upload)` with `UploadWidget`, `Section(editor)` with `ComparisonSlider`+`GridEditor`, `Footer`; import from `features/` (not yet migrated — this is the shell-only refactor that makes later feature slices additive)
- [x] 4.3 Add a11y contrast test: compute contrast ratio from all token color pairs, assert ≥4.5:1 (normal text) and ≥3:1 (large text/UI)
- [x] 4.4 Smoke test: run dev server, verify PageLayout renders, no console errors

**Phase 4 test command**: `npm run test -- --run src/test/renderWithProvider.test.tsx`

---

## Phase 5: Feature Refactors (PR 5)

Replace flat `src/components/` files with `src/features/` directories. Each refactor uses design-system primitives + CSS Modules + a11y + loading/empty/error states.

### UploadWidget

- [x] 5.1 Create `frontend/src/features/UploadWidget/UploadWidget.tsx` + `UploadWidget.module.css` — uses `<Card>` drop zone, `<Button>`, `<Spinner>`, `<EmptyState>`, `useToast()`, drag-and-drop + file picker, `aria-busy` during upload, live region announcements
- [x] 5.2 Write integration tests: drop file → upload → success toast, file picker → upload → success, upload error → error toast, empty state renders before upload
- [x] 5.3 Delete `frontend/src/components/UploadWidget.tsx`

### ImageCropper

- [x] 5.4 Create `frontend/src/features/ImageCropper/ImageCropper.tsx` + `ImageCropper.module.css` — uses `<RangeSlider>` for crop controls, `<Button>`, tokens for spacing/colors, aspect-ratio canvas
- [x] 5.5 Write tests: renders with RangeSlider controls, crop ratio updates on slider change
- [x] 5.6 Delete `frontend/src/components/ImageCropper.tsx`

### ComparisonSlider

- [x] 5.7 Create `frontend/src/features/ComparisonSlider/ComparisonSlider.tsx` + `ComparisonSlider.module.css` — imports `renderGridCells()` from `canvas-render.ts`, keyboard-accessible slider, live region for position changes
- [x] 5.8 Write integration tests: drag divider → ratio changes, keyboard Left/Right moves slider, live region announces position
- [x] 5.9 Delete `frontend/src/components/ComparisonSlider.tsx`

### GridEditor

- [x] 5.10 Create `frontend/src/features/GridEditor/GridEditor.tsx` + `GridEditor.module.css` — imports `renderGridCells()` + `hitTestCell()` from `canvas-render.ts`, `<Card>` container, `<Button>`/`<IconButton>` toolbar, keyboard cell navigation (arrow keys), cell recolor (Enter/Space), live region announces "Cell [r,c] changed to [color]"
- [x] 5.11 Write integration tests: click cell → cycles color, arrow keys move focus, Enter recolors, Ctrl+Z undo, empty skeleton state, live region text checked
- [x] 5.12 Delete `frontend/src/components/GridEditor.tsx`

### A11y verification

- [x] 5.13 Run full vitest-axe suite across all features: zero axe violations
- [x] 5.14 Verify all feature tests pass: `npm run test -- --run src/features/`

**Phase 5 test command**: `npm run test -- --run src/features/`

---

## Threat Matrix (from design — no applicable cases)

No routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. All work is local component rendering with no side effects. Threat matrix: N/A.

---

## Dependency Order Summary

```
PR 1 (Foundation)
  └─ tokens.css, global.css, index.html, canvas-render.ts

PR 2 (Primitives) — depends on PR 1
  └─ 8 ui/ components + tests

PR 3 (Layout + Feedback) — depends on PR 2
  └─ feedback/ + layout/ components + tests

PR 4 (App Shell) — depends on PR 3
  └─ main.tsx, App.tsx, ToastProvider wiring

PR 5 (Features) — depends on PR 4
  └─ 4 features (UploadWidget, ImageCropper, ComparisonSlider, GridEditor) + tests
  └─ Delete flat components
```
