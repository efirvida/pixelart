# Tasks: Image Pixel Reducer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation + Core | PR 1 | `pytest tests/core/` | N/A (unit only) | backend/core/ + pyproject.toml + requirements.txt |
| 2 | API + Infra | PR 2 | `pytest tests/api/` | `uvicorn backend.api.main:app` | backend/api/ + .github/ + deploy/ |
| 3 | Frontend | PR 3 | `vitest` | `vite --port 5173` | frontend/src/ |

## Phase 1: Project Foundation

- [x] 1.1 Create `backend/pyproject.toml` — package name, pytest config, dependencies
- [x] 1.2 Create `backend/requirements.txt` — FastAPI, Pillow, numpy, colour-science, reportlab, uvicorn
- [x] 1.3 Create `frontend/package.json` — React 18, Vite, vitest, React Testing Library, @testing-library/user-event
- [x] 1.4 Create `frontend/vite.config.ts` — proxy /api/* → localhost:8000, test environment
- [x] 1.5 Create `tests/conftest.py` — pytest fixtures for test images and palettes
- [x] 1.6 Initialize git repo with `.gitignore` (node_modules/, __pycache__/, dist/, .pytest_cache/)

## Phase 2: Core Module (Pure Python — No FastAPI Imports)

- [x] 2.1 TDD: `tests/core/test_image_pipeline.py` + `backend/core/image_pipeline.py` — ingest (JPEG/PNG/WebP → RGB array), resize (N×N bicubic), extract pixels; reject BMP/TIFF and corrupt files per spec scenarios
- [x] 2.2 TDD: `tests/core/test_palette_matcher.py` + `backend/core/palette_matcher.py` — hex→RGB, RGB→CIELAB (colour-science), ΔE2000 nearest-match, tie-break by index; validate palette 1–10 colors, reject invalid hex
- [x] 2.3 TDD: `tests/core/test_pdf_exporter.py` + `backend/core/pdf_exporter.py` — reportlab grid (5mm cells), column labels A–Z/AA–, row labels 1–N, legend with swatch+hex+count, pagination guard; reject empty grid

## Phase 3: API + Deployment Infrastructure

- [x] 3.1 Create `backend/api/schemas.py` — Pydantic models: UploadRequest (file + palette JSON + grid_size), ExportRequest (grid + palette + cell_size_mm), UploadResponse (grid + palette + dimensions)
- [x] 3.2 Create `backend/api/routes/upload.py` — POST /api/upload: validate image type/size (<10MB), call image_pipeline + palette_matcher, return JSON; HTTP 413/415/422 per spec
- [x] 3.3 Create `backend/api/routes/export.py` — POST /api/export: validate grid/palette, call pdf_exporter.generate(), return PDF bytes with Content-Type: application/pdf
- [x] 3.4 Create `backend/api/main.py` — FastAPI app with CORS (allow React origin), include routers from upload/export, health check GET /
- [x] 3.5 Create `tests/api/test_upload.py` — FastAPI TestClient: valid upload, 413 oversized, 415 wrong type, 422 corrupt
- [x] 3.6 Create `tests/api/test_export.py` — FastAPI TestClient: valid export, empty grid guard
- [x] 3.7 Create `.github/workflows/ci.yml` — on push/PR: pytest backend/ + vitest frontend/, artifact upload on failure
- [x] 3.8 Create `deploy/nginx.conf` — serve / from frontend build, proxy /api/* → localhost:8000
- [x] 3.9 Create `deploy/pixelart.service` — systemd unit: User=..., ExecStart=uvicorn, WorkingDirectory=, Restart=always

## Phase 4: Frontend

- [x] 4.1 Create `frontend/src/api/client.ts` — typed fetch wrappers for POST /api/upload (FormData) and POST /api/export (JSON), return types matching Pydantic schemas
- [x] 4.2 Create `frontend/src/context/GridContext.tsx` — React Context: grid state, palette, original image, undo stack, setCellColor(), resetGrid()
- [x] 4.3 Create `frontend/src/components/UploadWidget.tsx` — drag-and-drop zone + file input, POST to /api/upload, loading indicator, error display (413/415/422 messages)
- [x] 4.4 Create `frontend/src/components/ComparisonSlider.tsx` — draggable vertical divider, left=original image, right=matched grid canvas, syncs with grid edits
- [x] 4.5 Create `frontend/src/components/GridEditor.tsx` — canvas render of N×N grid, click cell → cycle palette index, Ctrl+Z undo, cell hover highlight, responsive sizing
- [x] 4.6 Create `frontend/src/App.tsx` — compose UploadWidget → ComparisonSlider + GridEditor, PDF download button triggers POST /api/export with current grid state
- [x] 4.7 Create vitest tests for `GridEditor` — renders correct grid size, click cycles color, undo reverts, error boundary
- [x] 4.8 Create vitest tests for `ComparisonSlider` — divider drag updates ratio, syncs with grid edits
