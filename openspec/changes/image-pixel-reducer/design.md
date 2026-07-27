# Design: Image Pixel Reducer

## Technical Approach

Monorepo structure separating pure Python core logic from FastAPI transport layer. Frontend is a standalone React app communicating via REST API. The core module (`backend/core/`) handles image processing, CIELAB color matching, and PDF generation with zero framework dependencies, enabling independent testing and future reuse. The API layer (`backend/api/`) is a thin FastAPI wrapper that validates inputs and delegates to core. React frontend handles all interactive editing offline after initial upload.

## Architecture Decisions

| Decision | Option | Tradeoff | Chosen |
|----------|--------|----------|--------|
| **Project Structure** | Monorepo (backend/ + frontend/) vs separate repos | Monorepo: single CI/CD, atomic changes. Separate: independent versioning | Monorepo |
| **Image Processing** | Pillow vs OpenCV vs scikit-image | Pillow: lightweight, pure Python, sufficient for resize. OpenCV: heavier, overkill. scikit-image: scipy dependency | Pillow |
| **CIELAB ΔE2000** | colour-science vs colormath vs manual implementation | colour-science: comprehensive, well-tested. colormath: older, less maintained. Manual: error-prone | colour-science |
| **PDF Generation** | reportlab vs fpdf2 vs weasyprint | reportlab: mature, precise positioning. fpdf2: simpler API. weasyprint: HTML/CSS-based, harder to control physical dimensions | reportlab |
| **Grid Data Format** | 2D array vs flat array vs sparse representation | 2D: matches spec, intuitive. Flat: simpler serialization. Sparse: complex for dense grids | 2D array |
| **Frontend Grid Rendering** | Canvas vs SVG vs CSS Grid | Canvas: performant for large grids. SVG: declarative, easier interaction. CSS Grid: simple but limited | Canvas |
| **State Management** | React Context vs Redux vs Zustand | Context: built-in, sufficient for small app. Redux: overkill. Zustand: lightweight alternative | React Context |

## Data Flow

```
User Browser                    FastAPI API                    Core Module
     │                              │                              │
     │  POST /api/upload            │                              │
     │  (multipart image + palette) │                              │
     ├─────────────────────────────>│                              │
     │                              │  image_pipeline.ingest()     │
     │                              ├─────────────────────────────>│
     │                              │  RGB array + metadata        │
     │                              │<─────────────────────────────│
     │                              │                              │
     │                              │  image_pipeline.resize()     │
     │                              ├─────────────────────────────>│
     │                              │  N×N pixel grid              │
     │                              │<─────────────────────────────│
     │                              │                              │
     │                              │  palette_matcher.match()     │
     │                              ├─────────────────────────────>│
     │                              │  2D array of palette indices │
     │                              │<─────────────────────────────│
     │                              │                              │
     │  JSON response               │                              │
     │  {grid, palette, dimensions} │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  [User edits grid offline]   │                              │
     │                              │                              │
     │  POST /api/export            │                              │
     │  (edited grid + palette)     │                              │
     ├─────────────────────────────>│                              │
     │                              │  pdf_exporter.generate()     │
     │                              ├─────────────────────────────>│
     │                              │  PDF bytes                   │
     │                              │<─────────────────────────────│
     │  PDF download                │                              │
     │<─────────────────────────────│                              │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/core/image_pipeline.py` | Create | Ingest, resize, extract pixels; pure functions |
| `backend/core/palette_matcher.py` | Create | CIELAB conversion, ΔE2000 matching, tie-breaking |
| `backend/core/pdf_exporter.py` | Create | Render grid + legend + coordinates to PDF |
| `backend/api/main.py` | Create | FastAPI app, CORS config, router setup |
| `backend/api/routes/upload.py` | Create | POST /api/upload endpoint |
| `backend/api/routes/export.py` | Create | POST /api/export endpoint |
| `backend/api/schemas.py` | Create | Pydantic models for request/response validation |
| `backend/requirements.txt` | Create | Python dependencies |
| `backend/pyproject.toml` | Create | Package metadata, pytest config |
| `frontend/package.json` | Create | React dependencies, scripts |
| `frontend/vite.config.ts` | Create | Vite config with proxy for dev |
| `frontend/src/App.tsx` | Create | Main app component, routing |
| `frontend/src/components/UploadWidget.tsx` | Create | Drag-drop file upload |
| `frontend/src/components/GridEditor.tsx` | Create | Canvas grid, click-to-recolor |
| `frontend/src/components/ComparisonSlider.tsx` | Create | Before/after draggable slider |
| `frontend/src/context/GridContext.tsx` | Create | React Context for grid state |
| `frontend/src/api/client.ts` | Create | API client functions |
| `tests/core/test_image_pipeline.py` | Create | Unit tests for image processing |
| `tests/core/test_palette_matcher.py` | Create | Unit tests for CIELAB matching |
| `tests/core/test_pdf_exporter.py` | Create | Unit tests for PDF generation |
| `tests/api/test_upload.py` | Create | Integration tests for upload endpoint |
| `tests/api/test_export.py` | Create | Integration tests for export endpoint |

## Interfaces / Contracts

### Upload Endpoint

**Request**: `POST /api/upload`
- Multipart form: `file` (image), `palette` (JSON array of hex strings), `grid_size` (int, default 29)

**Response**: HTTP 200
```json
{
  "grid": [[0, 1, 2, ...], ...],  // 2D array of palette indices
  "palette": ["#FF0000", "#00FF00", ...],
  "dimensions": {"width": 29, "height": 29},
  "original_dimensions": {"width": 580, "height": 580}
}
```

### Export Endpoint

**Request**: `POST /api/export`
- JSON body: `grid` (2D int array), `palette` (hex strings), `cell_size_mm` (float, default 5.0)

**Response**: HTTP 200
- `Content-Type: application/pdf`
- Body: PDF byte stream

## Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit (core) | pytest | image_pipeline, palette_matcher, pdf_exporter with mock images |
| Integration (API) | pytest + FastAPI TestClient | Upload/export endpoints, validation errors |
| Frontend | vitest + React Testing Library | Component rendering, user interactions |
| E2E | Playwright (optional) | Full upload → edit → export flow |

## Deployment

- **Server**: VPS bare metal (no Docker)
- **Backend**: uvicorn running FastAPI app, managed by systemd
- **Frontend**: Static build served by nginx
- **Proxy**: nginx reverse proxy `/api/*` → uvicorn (localhost:8000), serves frontend at `/`
- **CI/CD**: GitHub Actions workflow: run tests → build frontend → SSH deploy to VPS (rsync + systemd restart)

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required (greenfield project).

## Open Questions

None — all requirements are clear from specs.
