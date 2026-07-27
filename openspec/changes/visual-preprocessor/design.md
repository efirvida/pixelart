# Design: Visual Preprocessor Redesign

## Technical Approach

Move image preprocessing (steps 1–6) from Python backend to Canvas API–based React frontend. The preprocessor renders a live `<canvas>` preview driven by filter controls. On "Process Image", an N×N RGB grid is extracted from the canvas and POSTed to `POST /api/match` for CIELAB ΔE2000 palette matching. Existing `/api/upload` and `palette_matcher.py` are untouched.

**Zero new npm dependencies.** All image operations use the Canvas API.

## Architecture Decisions

### Decision: Composable functions over pipeline class

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `ImagePipeline` class holding state, managing canvases | Stateful, harder to reason about | ❌ |
| Pure `ImageData → ImageData` functions orchestrated by React | Matches `canvas-render.ts` pattern, no class abstraction overhead | ✅ |

**Rationale**: The project already uses pure functions for canvas rendering (`canvas-render.ts`). A class adds complexity without benefit — React manages the lifecycle via `useRef` for offscreen canvases.
A class-free approach also makes testing trivial: `input ImageData → function → expected ImageData`.

### Decision: Combined pixel pass for grayscale + brightness + contrast

**Choice**: Merge grayscale, brightness, and contrast into a single `for` loop over `ImageData.data`.

**Rationale**: Three sequential `getImageData`/`putImageData` cycles on a 600×600 preview (~360K pixels) cost ~9ms each on modern hardware — fine for individual sliders. But during drag interactions (crop resize), all three recompute simultaneously. One combined pass saves two `ImageData` allocations and two full-pixel loops, reducing jank risk during drag. Saturation and dithering remain separate passes.

### Decision: Two-path rendering strategy

| Path | Data source | Output size | Use |
|------|------------|-------------|-----|
| Preview | `displayCanvas` — original drawn at 600px max | ~600×600 (or display container) | Live `<canvas>` the user sees |
| Extraction | `sourceCanvas` — full resolution → crop → resize → grid | gridSize × gridSize | POST body on "Process" click |

**Rationale**: The preview must be responsive (synchronous, <100ms per frame). Processing at full resolution on every slider move would stall the main thread. The extraction path sacrifices speed for quality — it works from the original resolution, applies crop at native scale, then downsamples to `gridSize`. This is also what professional photo editors do: display proxy for editing, full-res for export.

### Decision: State isolation — Preprocessor owns FilterParams, GridContext owns result

**Choice**: `FilterParams` is local React state inside `<Preprocessor>`. `GridContext` holds the final result after `POST /api/match` succeeds.

**Rationale**: `GridContext` is shared across `ComparisonSlider` and `GridEditor`. Putting transient preprocessing state there would trigger unnecessary re-renders in both consumers on every slider change. Local state is scoped to the preprocessor component subtree.

## Filter Chain Order

```
1. Decode      FileReader → Image → drawImage(sourceCanvas)
2. Grayscale   ITU-R 601-2: L = 0.299R + 0.587G + 0.114B
3. Brightness  additive +v per channel, clamped [0,255]
4. Contrast    (v - 128) × factor + 128, factor = (259 × (c + 255)) / (255 × (259 - c))
5. Saturation  HSL conversion, adjust S, back to RGB
6. Crop        9-arg drawImage from display canvas
7. Resize      drawImage to grid size
8. Dithering   Floyd-Steinberg on grayscale N×N grid
9. Extract     getImageData → 2D array of [R,G,B] triples
```

Steps 2+3+4 are combined into one pixel pass. Step 2 is a no-op when grayscale toggle is OFF (but the loop still runs for brightness/contrast). Dithering only applies at step 8 on the small grid — never on the display canvas.

## Data Flow

```
User drops file
    │
    ▼
handleImageFile(file)
    │
    ├──► FileReader.readAsDataURL → img.onload
    │       │
    │       ▼
    │    drawImage(img, sourceCanvas) // full-res offscreen
    │       │
    │       ├──► applyFilters(sourceCanvas, params, displaySize) → displayCanvas
    │       │       │
    │       │       ▼
    │       │    render to DOM <canvas> via ctx.drawImage(displayCanvas)
    │       │
    │       └──► [debounce 150ms] extractMiniPreview(displayCanvas, gridSize) → pixelGridCanvas
    │
    ▼
User clicks "Process Image"
    │
    ▼
applyFilters(sourceCanvas, params, gridSize) // full-res → grid
    │
    ▼
extractRgbGrid(gridCanvas)
    │
    ▼
matchGrid(grid, palette) → POST /api/match
    │
    ▼
GridContext.resetGrid(response.grid, response.palette, blobUrl)
    │
    ▼
ComparisonSlider + GridEditor render (unchanged)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/features/Preprocessor/Preprocessor.tsx` | Create | Parent component: state, drop zone, orchestrates children |
| `frontend/src/features/Preprocessor/Preprocessor.module.css` | Create | Layout styles for preprocessor panel |
| `frontend/src/features/Preprocessor/ImageCanvas.tsx` | Create | `<canvas>` with live filter preview + crop overlay SVG |
| `frontend/src/features/Preprocessor/ImageCanvas.module.css` | Create | Canvas containment and crop overlay styles |
| `frontend/src/features/Preprocessor/ControlsPanel.tsx` | Create | Accordion-organized RangeSliders and toggles |
| `frontend/src/features/Preprocessor/ControlsPanel.module.css` | Create | Controls layout + accordion mobile styles |
| `frontend/src/features/Preprocessor/PixelGridPreview.tsx` | Create | Small N×N canvas preview + cell count label |
| `frontend/src/features/Preprocessor/PixelGridPreview.module.css` | Create | Small canvas + label styles |
| `frontend/src/lib/image-preprocess.ts` | Create | Pure functions: `applyFilters`, `extractRgbGrid`, `combineGrayBrightContrast`, `toSaturation`, `cropImageData`, `floydSteinberg` |
| `frontend/src/api/client.ts` | Modify | Add `matchGrid()` function |
| `frontend/src/App.tsx` | Modify | Replace UploadWidget with Preprocessor when no grid loaded; show UploadWidget fallback |
| `backend/api/schemas.py` | Modify | Add `MatchRequest` Pydantic model |
| `backend/api/routes/upload.py` | Modify | Add `POST /api/match` endpoint |
| `backend/core/image_pipeline.py` | None | Preserved as reference implementation |
| `backend/core/palette_matcher.py` | None | Preserved unchanged |

## Interfaces / Contracts

### `frontend/src/lib/image-preprocess.ts`

```typescript
export interface FilterParams {
  grayscale: boolean;
  brightness: number;    // -100..100
  contrast: number;      // -100..100
  saturation: number;    // 0..200
  cropX: number;         // pixels on display canvas
  cropY: number;
  cropSize: number;      // square side on display canvas
  gridSize: number;      // 5..200
  dithering: boolean;
  ditherIntensity: number; // 0..100
}

export const DEFAULT_PARAMS: FilterParams;

// Apply full filter chain to source canvas, output to targetSize×targetSize
export function applyFilters(
  sourceCanvas: HTMLCanvasElement,
  params: FilterParams,
  targetSize: number,
): HTMLCanvasElement;

// Extract N×N grid of [R,G,B] triples from a canvas
export function extractRgbGrid(canvas: HTMLCanvasElement): number[][][];

// Combined grayscale→brightness→contrast single pixel pass
export function combineGrayBrightContrast(
  data: ImageData,
  grayscale: boolean,
  brightness: number,
  contrast: number,
): ImageData;

// HSL saturation adjust (separate pass)
export function adjustSaturation(data: ImageData, percent: number): ImageData;

// Floyd-Steinberg dither on grayscale N×N ImageData
export function floydSteinberg(data: ImageData, intensity: number): ImageData;
```

### `backend/api/schemas.py` — MatchRequest

```python
class MatchRequest(BaseModel):
    grid: list[list[list[int]]]  # N×N of [R,G,B] 0-255
    palette: list[str]           # "#RRGGBB", max 10

    @field_validator("grid")
    @classmethod
    def check_grid(cls, v: list[list[list[int]]]) -> list[list[list[int]]]:
        if not v or not v[0]:
            raise ValueError("Grid must not be empty")
        n = len(v)
        if n < 5 or n > 200:
            raise ValueError("Grid size must be between 5 and 200")
        for row in v:
            if len(row) != n:
                raise ValueError("Grid rows must have equal length")
            for pixel in row:
                if len(pixel) != 3 or any(ch < 0 or ch > 255 for ch in pixel):
                    raise ValueError("RGB values must be three integers in [0, 255]")
        return v

    @field_validator("palette")
    @classmethod
    def check_palette(cls, v: list[str]) -> list[str]:
        if not v or len(v) > 10:
            raise ValueError("Palette must contain 1-10 colors")
        pattern = re.compile(r"^#[0-9a-fA-F]{6}$")
        for c in v:
            if not pattern.match(c):
                raise ValueError(f"Invalid palette format: expected #RRGGBB, got '{c}'")
        return v
```

### `frontend/src/api/client.ts` — matchGrid

```typescript
export async function matchGrid(
  grid: number[][][],
  palette: string[],
): Promise<UploadResponse> {
  const res = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grid, palette }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw ApiError.fromResponse(res.status, body);
  }
  return res.json() as Promise<UploadResponse>;
}
```

## Component Design

### Preprocessor (parent)

```
Preprocessor
├── [no image] EmptyState + drop zone
└── [image loaded]
    ├── ImageCanvas       — preview canvas + crop overlay
    ├── ControlsPanel     — RangeSliders + toggles
    ├── PixelGridPreview  — debounced mini grid
    ├── PaletteInput      — TextArea with validation
    └── ProcessButton     — Button + loading state
```

State: `FilterParams` (local via `useState`), `sourceCanvasRef`, `displayCanvasRef`, `imageLoaded: boolean`, `processing: boolean`.

### ImageCanvas

- Receives: `sourceCanvas: HTMLCanvasElement | null`, `params: FilterParams`, `onCropChange: (crop: Partial<FilterParams>) => void`
- Uses a `<canvas>` ref + ResizeObserver for container-width sizing (max 600px, same pattern as `GridEditor`/`ComparisonSlider`)
- Crop overlay: SVG `<rect>` with dark mask outside, same technique as `ImageCropper.tsx` but rendered ON the canvas div (absolutely positioned SVG overlay)
- Drag interaction: `mousedown` on overlay SVG → `mousemove`/`mouseup` on `window` (RAF-throttled, same pattern as `ImageCropper` lines 78-115)
- Touch: mirror mouse events for mobile drag support

### ControlsPanel

Receives `params: FilterParams`, `onChange: (partial: Partial<FilterParams>) => void`, `onReset: () => void`.

Three sections:
1. **Color Adjust**: grayscale `<input type="checkbox">`, brightness/contrast/saturation `<RangeSlider>`s
2. **Geometry**: grid size `<RangeSlider>`, crop size `<RangeSlider>`
3. **Advanced** (collapsed on mobile): dithering toggle + intensity `<RangeSlider>`

Uses existing `<RangeSlider>`, `<Card>`, `<Button variant="secondary">` for Reset.

### PixelGridPreview

Receives `gridCanvas: HTMLCanvasElement | null`, `gridSize: number`.
Renders a small `<canvas>` (CSS-dimension capped at 120px) plus `"N×N = {cells} cells"` label.
Updated via `useEffect` with 150ms debounce (clear on param change).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `combineGrayBrightContrast`, `adjustSaturation`, `floydSteinberg` | Vitest, `createImageData()` in jsdom canvas mock |
| Unit | `extractRgbGrid` — verify 2D array shape and RGB values | Vitest + canvas mock |
| Unit | `MatchRequest` validation — invalid grid, bad hex, oversized | pytest |
| Integration | Preprocessor → load image → change slider → canvas updates | @testing-library/react + canvas assertion |
| Integration | Process click → `matchGrid` fetch → `GridContext.resetGrid` | Mock `matchGrid`, verify `resetGrid` called with response |
| Integration | `POST /api/match` with 29×29 grid + 3-color palette returns `UploadResponse` | FastAPI TestClient |
| E2E | Upload → adjust contrast → process → grid editor renders | Playwright or manual |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes.

## Migration / Rollout

No data migration. No feature flags. The existing `UploadWidget` component and `/api/upload` endpoint remain untouched. The `Preprocessor` is added as an alternative entry path in `App.tsx` — both flows coexist. Rollback: remove `<Preprocessor>` import from `App.tsx`, restore previous `UploadWidget`-only layout.

## Open Questions

None — all design decisions resolved above.
