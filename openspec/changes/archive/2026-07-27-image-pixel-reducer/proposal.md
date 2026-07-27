# Proposal: Image Pixel Reducer

## Intent
Users upload a photo and need a printable grid to recreate it as a mosaic with discrete colored pieces (perler beads, pegboard, Rubik's cube). No tool today bridges digital image processing to a PDF of cell-by-cell color assignments in CIELAB-matched palette colors.

## Scope

### In Scope
- Image upload + crop/adjust endpoint (FastAPI)
- Core pipeline: downsample to N×N grid, nearest-color match in CIELAB vs user palette (~10 colors)
- Configurable grid size (default 29×29, 5mm cell → 14.5×14.5cm board)
- React preview editor: grid render, click-to-swap cell, before/after slider
- PDF export: grid + color legend + position labels, downloadable
- Independent testable core module (no FastAPI imports)

### Out of Scope
- Orders, inventory, client interaction, auth/accounts
- Dithering/halftoning (solid per-cell color only)
- Auto image crop / aspect-ratio correction (user provides pre-cropped input)
- Auto-palette extraction / color sourcing

## Capabilities

### New Capabilities
- `image-pipeline`: image ingestion, resize to grid, nearest-color CIELAB mapping; pure functions.
- `palette-matching`: user-defined palette, CIELAB conversion, nearest-neighbor resolver per cell.
- `pdf-export`: render grid + legend + coordinates to downloadable PDF.
- `preview-editor`: React UI for live grid, click-to-recolor cells, before/after slider.
- `image-upload`: FastAPI endpoint + React upload widget for pre-cropped images.

## Approach
Backend split: `core/` (pure Python: CIELAB, resize, match, PDF) + `api/` (thin FastAPI transport). Frontend: React + canvas/SVG grid. PDF via `reportlab`. Nearest-color uses ΔE2000. Flow: upload → pipeline → editor → export.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/core/` | New | CIELAB, resize, match, PDF |
| `backend/api/` | New | Upload + export endpoints |
| `frontend/src/` | New | Upload, editor, slider |
| `tests/` | New | Unit core; integration endpoints |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CIELAB ΔE2000 looks wrong to users | Med | Manual cell recolor in editor |
| Large uploads crash API | Low | Max size, reject early |
| PDF unreadable at large N | Med | Paginate / cap N |

## Rollback Plan
Greenfield repo. Rollback = revert deploy commit on VPS; modular core remains intact if `/export` endpoint is removed (editor degrades to preview-only).

## Dependencies
- Backend: FastAPI, Pillow, numpy, colour-science, reportlab
- Frontend: React, Vite

## Success Criteria
- [ ] Upload 580×580 cropped JPG → 29×29 grid in <2s
- [ ] Every grid cell is a palette member unless user-overridden
- [ ] PDF prints clean grid + legend at A4
- [ ] Core tests run with zero FastAPI imports
- [ ] Click any cell to recolor; see before/after