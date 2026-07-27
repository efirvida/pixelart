# Exploration: Visual Preprocessor Redesign

> **Change**: Move all image preprocessing (steps 1–6 of the pipeline) from the Python backend to a Canvas API–based React frontend, leaving only CIELAB ΔE2000 palette matching on the backend.

## Current State

### Architecture Overview

The backend (`backend/core/image_pipeline.py`) runs a 7-step monolithic pipeline:

```
File bytes → [1] ingest → [2] grayscale → [3] contrast stretch → [4] square crop
           → [5] bicubic resize → [6] extract pixels → [7] palette match (CIELAB ΔE2000)
```

The frontend sends the raw image via multipart POST to `/api/upload`. It receives only the matched grid indices — it never sees any intermediate processing. The user has zero visibility into what the backend does to the image before pixelation.

### Pipeline Steps — Detailed

| # | Step | Location | What it does |
|---|------|----------|--------------|
| 1 | **Ingest** | `backend/core/image_pipeline.py:22-68` | Decodes raw bytes into Pillow Image, validates format (JPEG/PNG/WebP), converts to RGB. Rejects BMP/TIFF/corrupt data. |
| 2 | **Grayscale** | `backend/core/image_pipeline.py:71-81` | Converts RGB → luminance via ITU-R 601-2: `L = 0.299·R + 0.587·G + 0.114·B`. Returns RGB image with all 3 channels equal (single-channel luminance replicated). |
| 3 | **Contrast Stretch** | `backend/core/image_pipeline.py:84-112` | Histogram percentile-based stretch: clips low% darkest pixels to 0, high% brightest to 255, linearly stretches middle. Uses numpy percentile on luminance. Default 1%/99%. |
| 4 | **Square Crop** | `backend/core/image_pipeline.py:115-144` | Crops a square region. Default: centre square (side = min(w,h)). Can accept custom `crop_x`, `crop_y`, `crop_size` in natural pixels. |
| 5 | **Resize** | `backend/core/image_pipeline.py:147-180` | Bicubic resize to N×N (default 29). First performs centre square crop, then `Image.BICUBIC` downscale. |
| 6 | **Extract Pixels** | `backend/core/image_pipeline.py:183-199` | Reads pixel data from Pillow Image into `List[List[Tuple[int,int,int]]]` — a 2D grid of RGB tuples. |
| 7 | **Palette Match** | `backend/core/palette_matcher.py:96-146` | Converts each cell RGB → CIELAB via `colour.sRGB_to_XYZ` / `colour.XYZ_to_Lab`, matches to nearest palette color via `colour.delta_E(..., method="CIE 2000")`. Validates palette (max 10 colors, #RRGGBB format). |

### Current Frontend Flow

```
User selects file → UploadWidget → ImageCropper (interactive rectangle)
    → handleCropped() calls uploadImage() (multipart POST to /api/upload)
    → Backend runs full pipeline → Returns {grid, palette, dimensions}
    → GridContext.resetGrid() → ComparisonSlider + GridEditor render
```

**File**: `frontend/src/api/client.ts` — `uploadImage(file, palette, gridSize, cropX, cropY, cropSize)`
**Context**: `frontend/src/context/GridContext.tsx` — holds `grid`, `palette`, `originalImage`, `undoStack`
**Views**: `ComparisonSlider` (before/after split), `GridEditor` (clickable canvas grid)

### Existing UI Components (builder-friendly)

| Component | Location | Role |
|-----------|----------|------|
| `Card` | `src/components/ui/Card/` | Container with shadow, border-radius |
| `Button` / `IconButton` | `src/components/ui/Button/`, `IconButton/` | Actions with variants (primary, secondary) |
| `RangeSlider` | `src/components/ui/RangeSlider/` | Number slider with label, min/max/value |
| `Select` | `src/components/ui/Select/` | Dropdown selector |
| `TextArea` | `src/components/ui/TextArea/` | Multiline input (used for palette) |
| `Toast` | `src/components/feedback/Toast/` | Success/error notifications |
| `Spinner` | `src/components/feedback/Spinner/` | Loading indicator |
| `EmptyState` | `src/components/feedback/EmptyState/` | Placeholder with icon + message |
| `Skeleton` | `src/components/feedback/Skeleton/` | Loading skeleton |
| `Toolbar` | `src/components/layout/Toolbar/` | Action bar with alignment |
| `Section` / `PageLayout` | `src/components/layout/` | Responsive layout shell |
| `Modal` | `src/components/ui/Modal/` | Overlay dialog |

All styled via CSS Modules consuming design tokens from `src/styles/tokens.css` (CSS custom properties for colors, spacing, typography, shadows, radii, transitions).

### Frontend Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  }
  // devDeps: TypeScript 7, Vite 8, Vitest 4, Testing Library
}
```

**Zero UI libraries, zero canvas libraries, zero color libraries.** Everything is hand-built. This is both a strength (minimal bloat) and a constraint (must evaluate whether adding deps is worth it).

### Existing OpenSpec Specifications

The project has well-structured specs under `openspec/specs/`:

| Spec | Status | Relevance |
|------|--------|-----------|
| `image-pipeline` | Active | Backend pipeline steps — must be updated for frontend shift |
| `palette-matching` | Active | CIELAB matching — stays on backend, unchanged |
| `image-upload` | Active | Upload widget + endpoint — must be redesigned |
| `preview-editor` | Active | GridEditor + ComparisonSlider — consumes from GridContext, should not change |
| `app-shell` | Active | Responsive layout — unaffected |
| `design-system` | Active | Tokens + primitives — new components must comply |
| `accessibility` | Active | Cross-cutting a11y — new components must comply |
| `pdf-export` | Active | PDF generation — unaffected |

Archived changes in `openspec/changes/archive/`:
- `2026-07-27-image-pixel-reducer` — original backend pipeline + frontend
- `2026-07-27-frontend-professional-overhaul` — design system, a11y, component library

---

## Affected Areas

### Files to Modify

| File | Impact | Description |
|------|--------|-------------|
| `frontend/src/features/UploadWidget/UploadWidget.tsx` | **Heavy** | Current upload flow must become a preprocessing panel; remove direct upload, add image preview |
| `frontend/src/features/ImageCropper/ImageCropper.tsx` | **Moderate** | Crop UI should integrate into the preprocessor rather than being a separate screen; may become a sub-mode |
| `frontend/src/api/client.ts` | **Moderate** | Add `matchGrid(rgbGrid, palette)` function; keep `uploadImage` for backward compat or deprecate |
| `frontend/src/context/GridContext.tsx` | **Light** | Add optional preprocessed image state (for showing intermediate result), no breaking changes |
| `frontend/src/App.tsx` | **Moderate** | New section layout for preprocessor panel before the editor |
| `backend/api/routes/upload.py` | **Moderate** | Add `POST /api/match` endpoint accepting raw RGB grid instead of image bytes; keep `/api/upload` for fallback |
| `backend/api/schemas.py` | **Light** | Add `MatchRequest` schema with `grid: List[List[List[int]]]` (RGB triples) and `palette` |
| `backend/core/image_pipeline.py` | **None** | Keep as-is for backward compat / testing / alternative clients. Preprocessor in browser replaces it for the web flow. |
| `backend/core/palette_matcher.py` | **None** | Unchanged — continues to do CIELAB matching, just receives pixel grid from a different source |
| `openspec/specs/image-pipeline/spec.md` | **Light** | Note that web flow uses frontend alternative; backend pipeline remains for API-only clients |
| `openspec/specs/image-upload/spec.md` | **Moderate** | Add `/api/match` endpoint spec; update widget requirement to reference preprocessor |

### New Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/features/Preprocessor/Preprocessor.tsx` | Main preprocessor component — orchestrates Canvas pipeline, renders controls |
| `frontend/src/features/Preprocessor/Preprocessor.module.css` | Styles for preprocessor layout |
| `frontend/src/features/Preprocessor/ControlsPanel.tsx` | Sliders + toggles for brightness, contrast, saturation, grayscale, dithering |
| `frontend/src/features/Preprocessor/ControlsPanel.module.css` | Styles for controls layout |
| `frontend/src/lib/image-preprocess.ts` | Pure functions: grayscale, contrast stretch, resize, extract RGB — all via Canvas API / ImageData |
| `frontend/src/lib/color-filters.ts` | Pure functions: brightness, contrast, saturation adjustments on pixel data |
| `frontend/src/lib/dithering.ts` | Floyd-Steinberg dithering on ImageData |
| `frontend/src/lib/histogram.ts` | Histogram computation for contrast stretch (returns percentiles) |
| `frontend/src/__tests__/image-preprocess.test.ts` | Unit tests for preprocessing functions (vitest + canvas mock or jsdom) |
| `frontend/src/__tests__/dithering.test.ts` | Dithering algorithm tests |
| `frontend/openspec/changes/visual-preprocessor/specs/preprocessor/spec.md` | Delta spec for the new preprocessor feature |

---

## Transformation Feasibility (Canvas API vs Python)

| # | Step | Canvas API | Difficulty | Notes |
|---|------|-----------|------------|-------|
| 1 | **Ingest** | `FileReader.readAsDataURL()` → `new Image()` → `canvas.drawImage()` | **Trivial** | Browser natively decodes JPEG/PNG/WebP. Format validation via MIME type check on `File.type`. Canvas always gives RGBA, strip alpha for RGB. |
| 2 | **Grayscale** | `ctx.getImageData()` → per-pixel ITU-R 601-2 → `ctx.putImageData()` | **Trivial** | Pure pixel math: `L = 0.299*R + 0.587*G + 0.114*B`. Set all 3 channels to L. ~80 lines of JS. Also possible with `ctx.filter = 'grayscale(100%)'` but manual gives more control. |
| 3 | **Contrast stretch** | `getImageData()` → compute histogram → percentile LUT → `putImageData()` | **Medium** | Must iterate all pixels to build 256-bin histogram, find 1st/99th percentiles, build lookup table, re-apply. O(width×height) — fine for typical images (< 4000×3000), may lag on huge files (> 20MP). Web Worker recommended. |
| 4 | **Square Crop** | `canvas.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` | **Trivial** | Already partially implemented in `ImageCropper`. Canvas `drawImage` with 9-arg overload does this in one call. |
| 5 | **Resize** | `canvas.drawImage(img, 0, 0, N, N)` or `createImageBitmap(img, {resizeWidth: N, resizeHeight: N})` | **Trivial** | Canvas `drawImage` with target size does bicubic/bilinear by default (browser-dependent, but quality is good for downscaling). `createImageBitmap` with `resizeWidth`/`resizeHeight` gives explicit control and runs off-main-thread. |
| 6 | **Extract pixels** | `ctx.getImageData(0, 0, N, N).data` → `Uint8ClampedArray` → 2D array | **Trivial** | `ImageData.data` is flat RGBA, stride = N×4. Trivial to convert to `[[R,G,B], ...]`. |
| 7 | **Palette match** | N/A | **MUST be backend** | `colour-science` (Python) uses CIE-recommended reference implementation for sRGB→XYZ→Lab and ΔE2000. No JS library matches its precision. `colorjs.io` (npm) has ΔE2000 but differs from `colour-science` by up to 0.5–1.0 units due to different white-point handling. For color-critical matching, backend is non-negotiable. |

### Additional Preprocessing (New Capabilities)

These are transformations the user has **zero** control over today that become possible with frontend preprocessing:

| Feature | Canvas API | Difficulty | Value |
|---------|-----------|------------|-------|
| **Brightness** | `getImageData()` + add constant to RGB + clamp | **Trivial** | Essential. Let user brighten/darken before pixelation. |
| **Contrast** | `(v - 128) * factor + 128` per channel + clamp | **Trivial** | Essential. Applied BEFORE grayscale → dramatic effect on result. |
| **Saturation** | `ctx.filter = 'saturate(N%)'` or manual HSL | **Easy** | Moderate. Use `ctx.filter` for simplicity; falls back to manual HSL on older browsers. |
| **Dithering** | Floyd-Steinberg on downsampled grid | **Medium** | High value. Currently out of scope (per original proposal). Dithering applied BEFORE resize produces smoother gradients in the final grid. |
| **Color quantization** | Median cut or popularity algorithm | **Hard** | Low-medium. Useful if user wants to restrict image to N colors before palette match. Libraries exist (`rgbquant`). |
| **Sharpen/Blur** | `ctx.filter = 'blur(Npx)'` or convolution kernel | **Easy-Medium** | Low. Sharpening before downscale preserves edges. Convolution kernel (3×3) is ~30 lines. |
| **Threshold (B&W)** | Per-pixel luminance > threshold → black/white | **Trivial** | Moderate. For high-contrast silhouette effects. |

---

## Proposed Data Flow

### Current Flow

```
┌──────────┐    multipart POST      ┌──────────────────────┐    JSON            ┌──────────────┐
│  Browser  │ ──────────────────────▶│  /api/upload          │ ────────────────▶│  GridContext │
│           │    file + palette      │  (backend does ALL)   │    {grid,         │              │
│  Upload   │                        │  ingest               │     palette,      │  Editor +    │
│  Widget   │                        │  grayscale            │     dimensions}   │  Slider      │
│           │                        │  contrast             │                   │              │
│           │                        │  crop → resize        │                   │              │
│           │                        │  extract → match      │                   │              │
└──────────┘                        └──────────────────────┘                   └──────────────┘
```

### Proposed Flow

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER (Canvas API)                   │
│                                                          │
│  ┌──────────┐   ┌────────────────┐   ┌───────────────┐  │
│  │ File     │──▶│ Preprocessor   │──▶│ Extract       │  │
│  │ Selection │   │ Canvas         │   │ RGB Grid      │  │
│  │          │   │                │   │ N×N array     │  │
│  │          │   │ [Live preview] │   │ [[R,G,B],...] │  │
│  │          │   │  - Grayscale   │   │               │  │
│  │          │   │  - Brightness  │   │               │  │
│  │          │   │  - Contrast    │   │               │  │
│  │          │   │  - Saturation  │   │               │  │
│  │          │   │  - Dithering   │   │               │  │
│  │          │   │  - Crop        │   │               │  │
│  │          │   │  - Grid Size   │   │               │  │
│  └──────────┘   └────────────────┘   └───────┬───────┘  │
│                                               │          │
└───────────────────────────────────────────────┼──────────┘
                                                │
                                   JSON POST    │
                                   {grid,       │
                                    palette}    │
                                                ▼
                               ┌──────────────────────────┐
                               │  /api/match (NEW)        │
                               │                          │
                               │  validate_palette()      │
                               │  match_grid(rgb, hex[])  │
                               │  → CIELAB ΔE2000         │
                               │                          │
                               │  Returns: {grid,         │
                               │            palette,      │
                               │            dimensions}   │
                               └──────────┬───────────────┘
                                          │
                                          ▼
                               ┌──────────────────┐
                               │   GridContext     │
                               │   (unchanged)     │
                               └──────┬───────────┘
                                      │
                                      ▼
                   ┌──────────────────────────────────┐
                   │  ComparisonSlider + GridEditor   │
                   │        (unchanged)               │
                   └──────────────────────────────────┘
```

### New API Endpoint

```
POST /api/match
Content-Type: application/json

{
  "grid": [[[128, 64, 32], [255, 0, 0], ...], ...],   // N×N array of RGB triples
  "palette": ["#000000", "#404040", "#B0B0B0", "#FFFFFF"]
}

Response 200:
{
  "grid": [[0, 1, 2, 3, ...], ...],   // 2D palette indices
  "palette": ["#000000", "#404040", "#B0B0B0", "#FFFFFF"],
  "dimensions": {"width": 29, "height": 29}
}
```

The `match_grid()` function in `backend/core/palette_matcher.py` already accepts `RGBGrid2D` (a `List[List[RGB]]` where `RGB = Tuple[int, int, int]`). This is a **drop-in** wrapper — no logic changes needed, just a new route.

---

## Component Ideas

### Preprocessor Panel — Tree

```
Preprocessor (new feature)
├── ImageCanvas [new]
│   ├── Renders source image with all filters applied in real-time
│   ├── Constrained to max display size (e.g., 600×600 CSS px)
│   ├── Keyboard-accessible crop mode toggle
│   └── Reports filter state to live region
│
├── ControlsPanel [new]
│   ├── (Toggle)   Grayscale: on/off
│   ├── (Slider)   Brightness: -100 to +100
│   ├── (Slider)   Contrast:   -100 to +100
│   ├── (Slider)   Saturation: 0 to 200%
│   ├── (Toggle)   Dithering: on/off
│   ├── (Slider)   Dithering intensity: 0 to 100%
│   ├── (Select)   Crop mode: center square / manual / none
│   ├── (Slider)   Grid size: 5 to 200
│   └── (Button)   Reset to defaults
│
├── PixelGridPreview [new]
│   ├── Shows the N×N extracted grid as a small canvas
│   ├── Updates live as parameters change (debounced)
│   └── Shows cell count (N×N = total)
│
├── PaletteInput [existing — reuse TextArea]
│   └── One hex color per line
│
└── ProcessButton [existing — reuse Button]
    └── Sends RGB grid + palette to /api/match
```

### Integration with Existing Components

| Existing | How it changes |
|----------|---------------|
| `ImageCropper` | Crop becomes a **mode** within the preprocessor rather than a separate screen. The user adjusts crop visually on the preprocessor canvas. |
| `UploadWidget` | Splits into: file selection (drag/drop stays) + the new Preprocessor panel. The upload-to-backend step becomes send-to-match. |
| `ComparisonSlider` | **Unchanged.** Still receives `originalImage` (blob URL of original file) and `grid`/`palette` from context. |
| `GridEditor` | **Unchanged.** Still renders grid canvas, handles click-to-recolor, undo, keyboard nav. |
| `GridContext` | Add `originalFile: File | null` (optional) for re-processing. Existing `grid`, `palette`, `originalImage` stay. |

### UX Vision

```
┌─────────────────────────────────────────────────────────┐
│  Header: Pixel Art Editor                               │
├─────────────────────┬───────────────────────────────────┤
│                     │                                   │
│    Preprocessor     │    Editor                         │
│                     │                                   │
│  ┌───────────────┐  │  ┌─────────────────────────────┐  │
│  │               │  │  │  Before/After Slider         │  │
│  │   Image       │  │  │  ◀───────────▶              │  │
│  │   Preview     │  │  │  Original │ Grid             │  │
│  │   (live)      │  │  │           │                  │  │
│  │               │  │  └─────────────────────────────┘  │
│  └───────────────┘  │                                   │
│                     │  ┌─────────────────────────────┐  │
│  Brightness [━━●  ] │  │  Grid Editor (clickable)     │  │
│  Contrast   [━━ ● ] │  │  ■■■■■■                      │  │
│  Saturation [━━━ ●] │  │  ■■■■■■  ← click to recolor  │  │
│  Grid Size  [━━●  ] │  │  ■■■■■■                      │  │
│                     │  │  [Undo] [Export PDF]          │  │
│  [Grayscale ■]      │  └─────────────────────────────┘  │
│  [Dithering □]      │                                   │
│                     │                                   │
│  Pixel Preview      │                                   │
│  ┌───┐              │                                   │
│  │▓▓▓│ 29×29        │                                   │
│  └───┘              │                                   │
│                     │                                   │
│  Palette            │                                   │
│  #000000            │                                   │
│  #404040            │                                   │
│                     │                                   │
│  [Process Image]    │                                   │
│                     │                                   │
└─────────────────────┴───────────────────────────────────┘
```

On mobile, preprocessor stacks above editor.

---

## Dependency Suggestions

### Packages Worth Adding

| Package | Version | Purpose | Bundle Size | Justification |
|---------|---------|---------|-------------|---------------|
| `colorjs.io` | ^0.5.2 | Color space conversions (sRGB ↔ Lab, HSL manipulations) | ~60KB gzipped | Reliable color math in browser. Used for any non-trivial color operations that need correctness. NOT for ΔE2000 (backend does that). |
| `image-q` | ^4.0.0 | Color quantization (median cut, NeuQuant) | ~20KB gzipped | If we add color quantization as a preprocessing option. Well-maintained, used in production image tools. |

### Packages NOT Worth Adding

| Package | Why NOT |
|---------|---------|
| `fabric.js` / `konva.js` | Heavy canvas abstraction layers (200KB+). We only need basic `getImageData`/`putImageData`/`drawImage`. Vanilla Canvas API is sufficient. |
| `react-konva` | Adds React wrapper for Konva. Same bloat issue. |
| `chroma-js` | Heavier than `colorjs.io` (~80KB vs 60KB). Both do similar things. |
| `sharp` (WASM port) | 5MB+ WASM bundle. Overkill — Canvas API does all the image ops we need natively. |
| `pica` (Lanczos resizer) | Lanczos is marginally better than Canvas bicubic for upscaling. We're always downscaling (to N×N grid). Canvas default is good enough. |

**Decision**: Start with **zero new dependencies**. The Canvas API is powerful enough. Only add `colorjs.io` if browser color math proves insufficient for HSL adjustments (unlikely — we can implement sRGB↔HSL manually in ~30 lines).

---

## Technical Feasibility & Risks

### Performance Profile

| Scenario | Canvas API | Notes |
|----------|-----------|-------|
| 4000×3000 image, grayscale | ~8ms | Single pass per-pixel |
| 4000×3000 image, contrast stretch | ~15ms | Two passes (histogram + apply) |
| 4000×3000 image, all filters combined | ~50ms | Optimize: single pass combining all operations |
| 600×600 display canvas re-render | <5ms | `drawImage` from offscreen canvas |
| Extract 29×29 RGB grid | <1ms | `getImageData` on tiny canvas |
| Floyd-Steinberg dithering on 29×29 | <1ms | Trivial on small grid |
| Web Worker offload (full image) | ~80ms total | Worker serialization adds ~10ms overhead for Transferable objects |

**Key insight**: All heavy operations happen on the **displayed preview** (already downscaled to ~600px), not the original. The original is only used for the final extraction, which is also fast because it's resized to N×N (~841 pixels at 29²).

### Web Worker Strategy

For images > 4000px on either axis:
1. Create `OffscreenCanvas` in a Web Worker
2. Transfer `ImageBitmap` to worker
3. Worker applies all filters, returns processed `ImageData` via `Transferable`
4. Main thread renders to display canvas

This prevents blocking the UI thread. For images ≤ 4000px, main-thread processing is fast enough (<50ms).

### Risks

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **Canvas filter inconsistency** across browsers | Low | Medium | `ctx.filter` is well-supported (Chrome 52+, FF 49+, Safari 9.1+, Edge 79+). Use manual pixel math as fallback for Safari if needed. Test on all browsers. |
| **Large image OOM** (mobile) | Low | High | Cap input image dimensions at 6000×6000. Show warning for larger images. Resize to display bounds before processing. |
| **Color accuracy loss** (Canvas sRGB vs Python Pillow sRGB) | Low | Low | Both use sRGB. The backend CIELAB match is what matters. Canvas intermediate processing only affects the preview — the backend still does the final, accurate match. |
| **Backward compatibility** — existing `/api/upload` clients break | None | None | Keep `/api/upload` endpoint. Add `/api/match` as NEW. Old flow continues to work. Web flow switches to new endpoint. |
| **Mobile UX** — too many controls on small screen | Medium | Medium | Use accordion/collapsible sections for controls on mobile. Only show essential sliders (brightness, contrast, grid size) by default; advanced in expandable panel. |
| **Undo for preprocessing** | Low | Low | Preprocessing parameters are numeric — easy to reset to defaults. No complex undo stack needed (unlike cell edits). |
| **Existing spec drift** — `image-pipeline` spec describes backend-only flow | Medium | Medium | Update spec to note dual pipeline: frontend for web, backend for API clients. The pure-function contract of `image_pipeline.py` remains — it's just not used in the web flow. |
| **Accessibility** — sliders without proper ARIA | Low | High | `RangeSlider` already has ARIA. New controls MUST follow `accessibility` spec. Live region announces parameter changes. |

---

## Backend Changes (Minimal)

The only backend change needed is a **new endpoint** that wraps the existing `match_grid()` function:

```python
# backend/api/routes/upload.py (addition)

@router.post("/match", response_model=UploadResponse)
async def match_pixels(request: MatchRequest) -> UploadResponse:
    """Accept pre-processed RGB pixel grid, return palette-matched indices."""
    try:
        validate_palette(request.palette)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        index_grid = match_grid(request.grid, request.palette)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    height = len(index_grid)
    width = len(index_grid[0]) if height > 0 else 0

    return UploadResponse(
        grid=index_grid,
        palette=request.palette,
        dimensions=Dimensions(width=width, height=height),
    )
```

New schema:

```python
class MatchRequest(BaseModel):
    grid: List[List[List[int]]]   # N×N array of [R, G, B] triples
    palette: List[str]            # #RRGGBB strings
```

**Zero changes** to `image_pipeline.py` or `palette_matcher.py`.

---

## Recommendation

**YES — this redesign is feasible and architecturally sound.** Here's why:

1. **Canvas API is more than capable** for steps 1–6. The browser's `drawImage`, `getImageData`, and `putImageData` cover every preprocessing operation with equal or better performance than Pillow for typical image sizes.

2. **The user gains real-time visual feedback** — currently a black box. This is the primary value proposition.

3. **Backend impact is minimal** — one new endpoint that delegates to existing, proven `match_grid()` function. The heavy CIELAB math stays where it belongs.

4. **Existing editor features are unaffected** — `ComparisonSlider`, `GridEditor`, `GridContext` consume the same data shapes. They don't care whether the grid came from `/api/upload` or `/api/match`.

5. **The design system provides solid building blocks** — `RangeSlider`, `Button`, `Card`, `Select`, `Toggle` (can be built from existing patterns) are all ready. No new UI framework needed.

### Recommended Phasing

1. **Phase 1**: Build `src/lib/image-preprocess.ts` — pure functions for grayscale, contrast stretch, resize, extract. Unit-test thoroughly.
2. **Phase 2**: Add `POST /api/match` to backend with schema. Test independently.
3. **Phase 3**: Build `Preprocessor` + `ControlsPanel` components with live Canvas preview. Wire to `GridContext`.
4. **Phase 4**: Add dithering and saturation as optional features.
5. **Phase 5**: Polish — responsive layout, a11y audit, mobile optimization, Web Worker for large images.
6. **Phase 6**: Update `image-upload` and `image-pipeline` specs to reflect dual pipeline architecture.

---

## Ready for Proposal

**Yes.** The exploration confirms that:
- All steps are technically feasible in Canvas API
- The only backend dependency (CIELAB ΔE2000) stays on the backend via a clean new endpoint
- The component architecture fits naturally into the existing design system
- Existing specs need light updates, not rewrites
- Zero breaking changes to existing flows

**The orchestrator should tell the user**: The redesign is solid. The backend's `match_grid()` function is already a drop-in target for a preprocessed RGB array. The Canvas API gives you live-preview grayscale, contrast, brightness, saturation, dithering — all without a single npm dependency. The only question is scope: do you want all preprocessing options in v1, or start with the essentials (grayscale + contrast + crop + grid size) and iterate from there?
