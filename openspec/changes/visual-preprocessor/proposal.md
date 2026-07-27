# Proposal: Visual Preprocessor Redesign

## Intent

Move image preprocessing from Python backend to Canvas API-based React frontend for real-time visual control. Backend keeps only CIELAB ΔE2000 palette matching.

## Scope

| In Scope (v1) | Out of Scope (v2+) |
|---------------|---------------------|
| Drag/drop + file picker | Color quantization |
| Live canvas preview of all filters | Web Worker offload |
| Grayscale toggle | Sharpen/blur kernels |
| Brightness (-100/+100), Contrast (-100/+100), Saturation (0–200%) | Parameter undo stack |
| Interactive square crop on canvas | Direct cell recoloring |
| Grid size slider (5–200) | |
| Floyd-Steinberg dithering + intensity | |
| Palette textarea (one hex/line) | |
| Process Image → POST /api/match | |
| Design-system + a11y compliance | |

## Capabilities

### New
- `visual-preprocessor`: Canvas API preprocessing pipeline with live preview, crop, resize, RGB extraction, dithering. Sends N×N RGB grid to `/api/match`.

### Modified
- `image-pipeline`: Web flow uses frontend for steps 1–6. Backend pipeline preserved for API clients.
- `image-upload`: New `POST /api/match` accepts preprocessed grids, delegates to `match_grid()`. Existing `/api/upload` preserved.

## Approach

Zero new npm deps. Canvas API: `FileReader` + `drawImage()` for ingest; `getImageData()`/`putImageData()` for per-pixel filters; `ctx.filter` for saturation; 9-arg `drawImage()` for crop/resize. Floyd-Steinberg applied before final resize. Backend adds thin `POST /api/match` wrapping existing `match_grid()` — zero changes to `palette_matcher.py` or `image_pipeline.py`. Preprocessor panel sits beside ComparisonSlider/GridEditor — both consume GridContext unchanged.

## API Contract

```
POST /api/match  (Content-Type: application/json)
Request:  { "grid": [[[128,64,32],...]], "palette": ["#000000",...] }
Response: { "grid": [[0,1,...]], "palette": [...], "dimensions": {w, h} }
Errors:   422 (invalid palette/grid), 413 (grid too large)
```

## Component Tree

```
Preprocessor
├── ImageCanvas        — live filter preview + crop mode
├── ControlsPanel      — RangeSliders for brightness/contrast/saturation/grid
│   └── Toggles: grayscale, dithering
├── PixelGridPreview   — N×N extracted grid (live)
├── PaletteInput       — TextArea, one hex/line
└── ProcessButton      — sends to /api/match
```

## Affected Areas

| Area | Impact |
|------|--------|
| `frontend/src/features/Preprocessor/` | New — Preprocessor, ControlsPanel, PixelGridPreview |
| `frontend/src/lib/` — image-preprocess, color-filters, dithering | New — pure functions |
| `frontend/src/api/client.ts` | Add `matchGrid()` |
| `frontend/src/App.tsx` | New layout section |
| `backend/api/routes/upload.py` | Add `POST /api/match` |
| `backend/api/schemas.py` | Add `MatchRequest` |
| `backend/core/image_pipeline.py`, `palette_matcher.py` | None — preserved |

## Risks

| Risk | Mitigation |
|------|-----------|
| Canvas filter inconsistency across browsers | `ctx.filter` well-supported (Chrome 52+, FF 49+); manual pixel fallback |
| Mobile OOM on large images | Cap at 6000×6000px; process display-sized preview |
| Too many controls on mobile | Accordion sections; essentials visible, advanced collapsed |
| Backward compat break | `/api/upload` stays; `/api/match` is additive |

## Rollback

Remove preprocessor import from `App.tsx`, restore UploadWidget flow. `/api/upload` untouched — no backend rollback needed.

## Success Criteria

- [ ] All filter controls drive real-time canvas preview
- [ ] Crop + grid size work interactively on canvas
- [ ] Dithering toggle produces visible quality improvement
- [ ] POST /api/match returns valid palette indices
- [ ] ComparisonSlider and GridEditor render unchanged
- [ ] All controls pass a11y audit (keyboard, ARIA, live regions)
- [ ] Existing `/api/upload` flow continues to work
