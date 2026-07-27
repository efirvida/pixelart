# Design: Frontend Professional Overhaul

## Technical Approach

Rebuild the presentation layer bottom-up: **tokens → primitives → layout → features**, preserving the existing data flow and `GridContext` unchanged. Every inline style is replaced by CSS Modules consuming `tokens.css` custom properties. The four feature components move from `src/components/` to `src/features/` as self-contained modules. A shared `canvas-render.ts` extracts the duplicated cell-rendering math from `GridEditor` and `ComparisonSlider`. TDD strict per `config.yaml`.

## Architecture Decisions

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Styling strategy | CSS Modules, Tailwind, styled-components, vanilla-extract | **CSS Modules** | Zero runtime cost, built-in Vite support, no new deps. Tailwind adds build dep + utility sprawl. styled-components adds runtime overhead. vanilla-extract adds build complexity for marginal gain. |
| Component organization | Flat `components/`, feature-sliced, barrel exports | **Categorized: `ui/`, `layout/`, `feedback/`, `features/`** | Separates reusable primitives from business features. Features self-contain their `.module.css`. No barrel `index.ts` — explicit imports for tree-shaking. |
| Toast architecture | Prop-drilling, React context, custom events | **Context + imperative API** (`ToastProvider` + `useToast` hook) | Context avoids global event fragility. Imperative `toast.error(msg)` via hook for ergonomic call sites. Provider wraps app in `main.tsx`. |
| Canvas render extraction | Inline duplication, shared module, render-as-component | **Shared `src/lib/canvas-render.ts`** | Pure functions: `renderGridCells(ctx, grid, palette, bounds)` and `hitTestCell(point, grid, bounds)`. Both GridEditor and ComparisonSlider call them. Zero visual regression — same math, same output. |
| ErrorBoundary pattern | Class component, react-error-boundary lib | **Class component** | React requires class for `componentDidCatch`. Zero new deps. Fallback UI uses design-system primitives (`Card`, `Button`). |
| Ref forwarding | `forwardRef`, no refs | **`forwardRef` on all primitives** | Spec requires ref forwarding. `forwardRef` with `displayName` for devtools. |

## Data Flow

```
                    ┌──────────────────────────────────┐
                    │           main.tsx                │
                    │  ErrorBoundary                    │
                    │  └─ ToastProvider                 │
                    │     └─ GridProvider               │
                    │        └─ PageLayout              │
                    │           ├─ Header               │
                    │           ├─ Section (upload)     │
                    │           │  └─ UploadWidget      │
                    │           │     └─ ImageCropper   │
                    │           ├─ Section (editor)     │
                    │           │  ├─ ComparisonSlider  │
                    │           │  └─ GridEditor        │
                    │           └─ Footer               │
                    └──────────────────────────────────┘

Upload file → Crop → POST /api/upload → GridContext → Edit → POST /api/export → PDF
```

**No data flow changes.** `GridContext` and `api/client.ts` remain untouched. Toast is consumed via `useToast()` hook at feature-component level for upload/export feedback.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/styles/tokens.css` | Create | All design tokens as CSS custom properties |
| `src/styles/global.css` | Create | Reset + `tokens.css` import, base typography |
| `src/lib/canvas-render.ts` | Create | `renderGridCells()`, `hitTestCell()`, `computeCellBounds()` |
| `src/components/ui/Button/` | Create | `Button.tsx` + `.module.css` — primary/secondary/ghost variants |
| `src/components/ui/IconButton/` | Create | Icon-only button with `aria-label` |
| `src/components/ui/Card/` | Create | Container with elevation tokens |
| `src/components/ui/TextInput/` | Create | Input with label, error, `aria-invalid` |
| `src/components/ui/TextArea/` | Create | Multi-line input with label |
| `src/components/ui/RangeSlider/` | Create | Slider with `role="slider"`, ARIA attrs |
| `src/components/ui/Select/` | Create | Native select wrapper |
| `src/components/ui/Modal/` | Create | Portal + focus trap + escape close |
| `src/components/layout/PageLayout/` | Create | CSS Grid responsive shell |
| `src/components/layout/Section/` | Create | Content section with title |
| `src/components/layout/Toolbar/` | Create | Horizontal actions, icon-collapse <768px |
| `src/components/layout/Header/` | Create | App header with title |
| `src/components/layout/Footer/` | Create | App footer |
| `src/components/feedback/Toast/` | Create | `ToastProvider`, `useToast`, auto-dismiss |
| `src/components/feedback/Spinner/` | Create | CSS-only spinner, `role="status"` |
| `src/components/feedback/Skeleton/` | Create | Pulsing placeholder rectangle |
| `src/components/feedback/EmptyState/` | Create | Icon + message + optional action |
| `src/components/feedback/ErrorBoundary/` | Create | Class component, fallback UI, "Reload" button |
| `src/features/UploadWidget/` | Create | Refactored — uses Card, Button, Spinner, EmptyState, Toast |
| `src/features/ImageCropper/` | Create | Refactored — uses RangeSlider, Button, tokens |
| `src/features/ComparisonSlider/` | Create | Refactored — uses `canvas-render.ts`, Button, tokens |
| `src/features/GridEditor/` | Create | Refactored — uses `canvas-render.ts`, keyboard nav, live region |
| `src/components/UploadWidget.tsx` | Delete | Replaced by `src/features/UploadWidget/` |
| `src/components/ImageCropper.tsx` | Delete | Replaced by `src/features/ImageCropper/` |
| `src/components/ComparisonSlider.tsx` | Delete | Replaced by `src/features/ComparisonSlider/` |
| `src/components/GridEditor.tsx` | Delete | Replaced by `src/features/GridEditor/` |
| `src/App.tsx` | Modify | Use PageLayout/Header/Footer, import from features/ |
| `src/main.tsx` | Modify | Wrap with ErrorBoundary + ToastProvider, import global.css |
| `index.html` | Modify | Meta description, favicon, font preconnect |
| `src/test/renderWithProvider.tsx` | Modify | Add ToastProvider wrapper |

## Interfaces / Contracts

### Canvas Render Module

```typescript
// src/lib/canvas-render.ts

export interface RenderBounds {
  displayW: number;
  displayH: number;
  padding: number;
}

export interface CellBounds {
  cellW: number;
  cellH: number;
  rows: number;
  cols: number;
}

export function computeCellBounds(
  grid: number[][],
  bounds: RenderBounds,
): CellBounds;

export function renderGridCells(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  palette: string[],
  bounds: RenderBounds,
  highlight?: { row: number; col: number } | null,
): void;

export function hitTestCell(
  point: { x: number; y: number },
  grid: number[][],
  bounds: RenderBounds,
): { row: number; col: number } | null;
```

### Toast API

```typescript
// src/components/feedback/Toast/ToastProvider.tsx

interface ToastOptions {
  duration?: number;  // default 4000ms
  variant?: 'success' | 'error' | 'info';
}

interface ToastAPI {
  success(message: string, opts?: ToastOptions): void;
  error(message: string, opts?: ToastOptions): void;
  info(message: string, opts?: ToastOptions): void;
  dismiss(id: string): void;
}

function useToast(): ToastAPI;
```

### UI Primitive Contract (all primitives)

```typescript
interface PrimitiveProps {
  className?: string;  // external composition
  // ... component-specific props
}
// All primitives use forwardRef and set displayName
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each UI primitive renders variants, disabled, loading, forwards ref | Vitest + @testing-library, one test file per primitive |
| Unit | `canvas-render.ts` pure functions: cell bounds, hit-test, render calls | Mock `CanvasRenderingContext2D` (already in `setup.ts`), verify call args |
| Unit | Feedback: Toast show/dismiss/auto-dismiss, Spinner role, ErrorBoundary catches | Vitest + @testing-library, `jest.spyOn(console, 'error')` for boundary |
| Integration | UploadWidget flow: drop → crop → upload → toast | `renderWithProvider` + `userEvent`, mock `fetch` |
| Integration | GridEditor: click cell → cycle color → undo via Ctrl+Z | `renderWithProvider`, canvas click simulation |
| Integration | ComparisonSlider: drag divider → ratio changes | `renderWithProvider`, mouse events |
| A11y | Focus-visible, ARIA roles/names, keyboard nav, live regions | `vitest-axe` for automated, manual `role`/`name` assertions |
| A11y | Color contrast on token pairs | Unit test computing contrast ratio from token hex values |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure frontend component work.

## Migration / Rollout

No data migration. The rollout follows the chained-PR slice order from `tasks.md`:

1. **Slice 1**: `tokens.css` + `global.css` + `index.html` meta — additive, no breakage
2. **Slice 2**: UI primitives (`ui/`) — additive, unused until features migrate
3. **Slice 3**: Layout components + ErrorBoundary + Toast — `main.tsx` wraps, `App.tsx` uses `PageLayout`
4. **Slice 4**: `canvas-render.ts` — extracted module, features import it
5. **Slice 5**: Feature refactors (UploadWidget → ImageCropper → ComparisonSlider → GridEditor) — each replaces its flat `components/` counterpart, old file deleted in same slice

Each slice is independently deployable and revertable. No feature flag needed — the old inline-style code is deleted only when the replacement is tested and green.

## Open Questions

- [ ] Should the Modal use a React Portal (renders outside DOM hierarchy) or an absolutely-positioned div within the app root? Portal is cleaner for z-index but adds complexity.
- [ ] Should `canvas-render.ts` export a `drawHighlight` separately from `renderGridCells` to allow ComparisonSlider to skip highlight logic entirely? Current design merges them with an optional param.
