# Visual Preprocessor — Change Specification

> **Change**: Move image preprocessing (steps 1–6) from Python backend to Canvas API–based React frontend. Backend keeps only CIELAB ΔE2000 palette matching via new `POST /api/match`.

## Overview

The visual preprocessor gives users real-time visual control over image preprocessing. Instead of uploading a raw image and receiving only matched indices, users now see a live canvas preview with interactive controls for grayscale, brightness, contrast, saturation, crop, grid size, and dithering. The preprocessed N×N RGB grid is sent to the backend for palette matching only.

**Zero new npm dependencies.** All image operations use the Canvas API.

## Capabilities

| Capability | Type | Spec Location |
|-----------|------|---------------|
| `visual-preprocessor` | **New** | `specs/visual-preprocessor/spec.md` |
| `image-pipeline` | Modified | `specs/image-pipeline/spec.md` (delta) |
| `image-upload` | Modified | `specs/image-upload/spec.md` (delta) |

## Domain Specs

### visual-preprocessor (New)

Canvas API preprocessing pipeline with live preview. 13 functional requirements covering file selection, live preview, grayscale, brightness, contrast, saturation, crop, grid size, dithering, reset, palette input, process action, and pixel grid preview. 3 non-functional requirements for performance (<100ms preview), responsive layout (360px–1920px), and accessibility compliance.

**Key decisions:**
- ITU-R 601-2 luminance for grayscale (matches backend)
- Floyd-Steinberg dithering applied before final resize
- 150ms debounce on pixel grid preview updates
- 6000×6000px max image dimension cap

### image-pipeline (Modified)

Added "Dual Pipeline Architecture" section:
- **Web flow**: Frontend Canvas API (steps 1–6) → `POST /api/match` (step 7)
- **API flow**: `POST /api/upload` continues unchanged (full backend pipeline)
- Backend `image_pipeline.py` preserved as reference implementation and test oracle

### image-upload (Modified)

Added three new requirements:
- **Match Endpoint**: `POST /api/match` with request/response schema, validation rules, error codes
- **Backward Compatibility**: `/api/upload` unchanged, both endpoints coexist
- **Frontend Match Client**: `matchGrid()` function in `client.ts`

## API Contract

```
POST /api/match  (Content-Type: application/json)
Request:  { "grid": [[[R,G,B],...]], "palette": ["#RRGGBB",...] }
Response: { "grid": [[0,1,...]], "palette": [...], "dimensions": {w, h} }
Errors:   422 (invalid palette/grid), 413 (grid too large)
```

## Component Tree

```
Preprocessor (new feature)
├── ImageCanvas        — live filter preview + crop mode
├── ControlsPanel      — RangeSliders for brightness/contrast/saturation/grid
│   └── Toggles: grayscale, dithering
├── PixelGridPreview   — N×N extracted grid (live, debounced 150ms)
├── PaletteInput       — TextArea, one hex/line
└── ProcessButton      — sends to /api/match
```

## Affected Files

| File | Impact |
|------|--------|
| `frontend/src/features/Preprocessor/` | **New** — Preprocessor, ControlsPanel, PixelGridPreview |
| `frontend/src/lib/image-preprocess.ts` | **New** — pure functions for Canvas API preprocessing |
| `frontend/src/lib/color-filters.ts` | **New** — brightness, contrast, saturation |
| `frontend/src/lib/dithering.ts` | **New** — Floyd-Steinberg |
| `frontend/src/api/client.ts` | **Modified** — add `matchGrid()` |
| `backend/api/routes/upload.py` | **Modified** — add `POST /api/match` |
| `backend/api/schemas.py` | **Modified** — add `MatchRequest` |
| `backend/core/image_pipeline.py` | **None** — preserved |
| `backend/core/palette_matcher.py` | **None** — preserved |

## Scenarios Summary

| # | Scenario | Domain |
|---|----------|--------|
| 1 | Drag-and-drop image load | visual-preprocessor |
| 2 | Click-to-browse image load | visual-preprocessor |
| 3 | Oversized image rejected (>6000×6000) | visual-preprocessor |
| 4 | Invalid file type rejected | visual-preprocessor |
| 5 | Preview updates on slider change (<100ms) | visual-preprocessor |
| 6 | Multiple filters compose | visual-preprocessor |
| 7 | Grayscale enabled/disabled | visual-preprocessor |
| 8 | Brightness increase/decrease | visual-preprocessor |
| 9 | Contrast increase/decrease | visual-preprocessor |
| 10 | Saturation boost/desaturation | visual-preprocessor |
| 11 | Drag crop region | visual-preprocessor |
| 12 | Adjust crop size via slider | visual-preprocessor |
| 13 | Grid size change updates preview | visual-preprocessor |
| 14 | Dithering enabled/intensity reduction | visual-preprocessor |
| 15 | Reset restores defaults | visual-preprocessor |
| 16 | Valid/invalid palette input | visual-preprocessor |
| 17 | Successful processing | visual-preprocessor |
| 18 | Processing shows loading state | visual-preprocessor |
| 19 | Processing error | visual-preprocessor |
| 20 | Live grid preview updates | visual-preprocessor |
| 21 | Grid size change reflected | visual-preprocessor |
| 22 | Small image performance (<100ms) | visual-preprocessor |
| 23 | Large image handling (Web Worker) | visual-preprocessor |
| 24 | Mobile layout (360px) | visual-preprocessor |
| 25 | Desktop layout (1280px) | visual-preprocessor |
| 26 | Keyboard navigation of all controls | visual-preprocessor |
| 27 | Slider keyboard adjustment | visual-preprocessor |
| 28 | Filter change announced (live region) | visual-preprocessor |
| 29 | Web flow uses frontend preprocessing | image-pipeline |
| 30 | API flow uses backend pipeline | image-pipeline |
| 31 | Backend pipeline remains testable | image-pipeline |
| 32 | Successful match | image-upload |
| 33 | Request/response schema | image-upload |
| 34 | Grid dimension validation | image-upload |
| 35 | Grid dimension range validation | image-upload |
| 36 | RGB value validation | image-upload |
| 37 | Palette format validation | image-upload |
| 38 | Palette size limit | image-upload |
| 39 | Grid too large (413) | image-upload |
| 40 | Matching performance (<2s) | image-upload |
| 41 | Upload endpoint unchanged | image-upload |
| 42 | Both endpoints coexist | image-upload |
| 43 | matchGrid sends correct payload | image-upload |
| 44 | matchGrid error handling | image-upload |

## Coverage

- **Happy paths**: ✅ All 13 functional requirements have happy-path scenarios
- **Edge cases**: ✅ Oversized images, invalid files, invalid palette, grid range limits, RGB range limits
- **Error states**: ✅ Toast feedback for errors, button disabled states, live region announcements
- **Accessibility**: ✅ Keyboard navigation, ARIA attributes, live regions, focus management
- **Performance**: ✅ <100ms preview, <2s matching, Web Worker for large images
- **Responsive**: ✅ Mobile (360px), tablet (768px), desktop (1280px+)
- **Backward compatibility**: ✅ `/api/upload` unchanged, both endpoints coexist

## Next Step

Ready for **design** (sdd-design). The design should cover:
1. Canvas API implementation strategy (offscreen canvas, filter pipeline order)
2. Component architecture (Preprocessor, ControlsPanel, PixelGridPreview)
3. State management (local preprocessor state vs GridContext integration)
4. Backend `POST /api/match` route and schema
5. Web Worker strategy for large images (>4000px)

## Risks

| Risk | Mitigation |
|------|-----------|
| Canvas filter inconsistency across browsers | `ctx.filter` well-supported (Chrome 52+, FF 49+); manual pixel fallback |
| Mobile OOM on large images | Cap at 6000×6000px; process display-sized preview |
| Too many controls on mobile | Accordion sections; essentials visible, advanced collapsed |
| Backward compat break | `/api/upload` stays; `/api/match` is additive |
