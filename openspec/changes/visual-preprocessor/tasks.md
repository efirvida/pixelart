# Tasks: Visual Preprocessor Redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2000 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Chain strategy | stacked-to-main (4 stacked PRs) |

Decision needed before apply: **No** (auto-forecast chose stacked)
Chained PRs recommended: **Yes**
Chain strategy: **stacked-to-main**
400-line budget risk: **High**

### Work Units (stacked-to-main)

| Unit | Goal | PR | Focused test | Harness | Rollback |
|------|------|----|--------------|---------|----------|
| WU-1 | `/api/match` + `matchGrid()` | PR 1 | `pytest tests/api/test_match.py -v` | `curl POST /api/match` 29×29 | additive, `/api/upload` untouched |
| WU-2 | `image-preprocess` lib | PR 2 | `npx vitest run image-preprocess.test.ts` | N/A (pure lib) | old flow stays |
| WU-3 | Preprocessor + ImageCanvas + ControlsPanel | PR 3 | `npx vitest run Preprocessor` | Manual: load, drag | `App.tsx` keeps UploadWidget |
| WU-4 | PixelGridPreview + App refactor + a11y/mobile | PR 4 | `npx vitest run` + a11y | Manual: 360px | Preprocessor still works |

PR-2 parallel to PR-1 (no shared code). PR-3 depends on PR-1+PR-2. PR-4 depends on PR-3.

## Task 1: `image-preprocess` library

**Description**: Pure `ImageData → ImageData` functions for the preprocessing chain. No React, no class.

**Files to create**:
- `frontend/src/lib/image-preprocess.ts`
- `frontend/src/__tests__/image-preprocess.test.ts`

**Dependencies**: none

**Acceptance Criteria**:
- [ ] `FilterParams`, `DEFAULT_PARAMS`, `applyFilters`, `extractRgbGrid` exported
- [ ] `combineGrayBrightContrast` is one pixel loop; skips luminance when `gray=false`
- [ ] `adjustSaturation`, `floydSteinberg`, `clamp`, `createOffscreenCanvas` exported
- [ ] Tests cover ITU-R 601-2 grayscale, brightness clamp, contrast, saturation, dithering, RGB shape

**Technical Notes**: ITU-R 601-2 `L = 0.299R + 0.587G + 0.114B`. Contrast `(259·(c+255))/(255·(259-c))`. Dither kernel `[[0,*,7],[3,5,1]]/16` × `intensity/100`. Saturation via HSL (not `ctx.filter`).

## Task 2: Backend `POST /api/match`

**Description**: Additive JSON endpoint delegating to `match_grid()`. No changes to `palette_matcher.py` / `image_pipeline.py`.

**Files to modify**:
- `backend/api/schemas.py` — add `MatchRequest`
- `backend/api/routes/upload.py` — add `POST /match`

**Files to create**: `tests/api/test_match.py`

**Dependencies**: none (parallel with Task 1)

**Acceptance Criteria**:
- [ ] `MatchRequest` validates grid 5–200, equal rows, RGB ∈ [0,255], palette 1–10 `#RRGGBB`
- [ ] 200 with `UploadResponse`; 422 on validation; 413 if grid > 200×200
- [ ] Existing `test_upload.py` still passes
- [ ] `test_match.py` covers happy path, bad palette, oversized, mismatched rows, RGB OOR, <2s for 29×29 × 5

**Technical Notes**: Reuse `validate_palette()`. `field_validator` on grid + palette. `HTTPException` codes per spec.

## Task 3: Preprocessor feature components

**Description**: React feature: ingest, controls, canvas preview, crop interaction, extraction, POST `/api/match`.

**Files to create**:
- `frontend/src/lib/pipeline.ts`
- `frontend/src/features/Preprocessor/{Preprocessor,ControlsPanel,ImageCanvas}.tsx` (+ `.module.css` each)

**Files to modify**: `frontend/src/api/client.ts` — add `matchGrid()`

**Dependencies**: Task 1, Task 2

**Acceptance Criteria**:
- [x] Decode via `FileReader` → `Image` → `drawImage`; reject >6000×6000 with toast
- [x] JPEG/PNG/WebP only; invalid types toast error
- [x] `FilterParams` local; `GridContext` only on Process success
- [x] Preview within 100ms for ≤4000px images
- [x] Crop drag (mouse + touch), RAF-throttled (`ImageCropper.tsx:78-115` pattern)
- [x] Crop mask via SVG (`ImageCropper.tsx:168-180`)
- [x] `pipeline.ts`: load → applyFilters → extractRgbGrid → matchGrid → resetGrid (inline in Preprocessor.tsx)
- [x] `matchGrid()` throws `ApiError` on 422
- [x] Process button shows `<Spinner>` + `aria-busy="true"`

**Technical Notes**: `useRef` for offscreen source canvas; never re-render React on filter change. Crop coords on display canvas; convert to natural px on Process. Reuse `<RangeSlider>`, `<Button>`, `<Card>`, `<TextArea>`, `<Toast>`.

## Task 4: App integration — refactor `App.tsx`

**Description**: Replace standalone UploadWidget with Preprocessor. Two-panel layout. Keep `UploadWidget` as fallback.

**Files to modify**: `frontend/src/App.tsx`, `frontend/src/App.module.css`

**Dependencies**: Task 3

**Acceptance Criteria**:
- [ ] `<Preprocessor />` in left upload panel
- [ ] Editor only when `grid.length > 0`
- [ ] Preprocessor stays visible after a match
- [ ] Layout: Header → [Preprocessor | Editor] → Footer
- [ ] `UploadWidget` retained; `App.module.css` adds two-column grid

**Technical Notes**: Preprocessor owns local state; only the response touches `GridContext`.

## Task 5: PixelGridPreview component

**Description**: Small live N×N preview canvas, debounced 150ms.

**Files to create**: `frontend/src/features/Preprocessor/PixelGridPreview.tsx` (+ `.module.css`)

**Files to modify**: `frontend/src/features/Preprocessor/Preprocessor.tsx` — render the preview

**Dependencies**: Task 4

**Acceptance Criteria**:
- [x] `<canvas>` (CSS max 200px) shows current N×N grid
- [x] Label `"{N}×{N} = {N*N} cells"` updates with grid size
- [x] Debounced 150ms; rapid slider drags do not stutter
- [x] `aria-label` describes the preview

**Technical Notes**: `useEffect` + `setTimeout` debounce, clear on cleanup. Render via `ctx.drawImage` after fresh `applyFilters(..., gridSize)`.

## Task 6: Mobile polish, a11y, responsive layout

**Description**: Accordion on mobile, touch support, full keyboard nav, live region, focus management, error boundaries.

**Files to modify**: `frontend/src/features/Preprocessor/{Preprocessor,ControlsPanel,ImageCanvas}.tsx`, `ControlsPanel.module.css`

**Files to create**: `frontend/src/features/Preprocessor/__tests__/Preprocessor.a11y.test.tsx`

**Dependencies**: Task 5

**Acceptance Criteria**:
- [ ] < 768px: controls collapse into an accordion
- [ ] Crop drag supports `touchstart`/`touchmove`/`touchend`
- [ ] Tab-reachable controls; arrow keys adjust sliders
- [ ] Live region announces filter changes
- [ ] Focus on first control at mount
- [ ] Error boundary wraps Preprocessor
- [ ] a11y test: `aria-valuemin/max/now`, accessible names, logical focus

**Technical Notes**: Accordion: `<details>`/`<summary>` or button + `aria-expanded`. Touch mirrors mouse (`preventDefault`). Focus: `useEffect` with `firstControlRef.current?.focus()`.
