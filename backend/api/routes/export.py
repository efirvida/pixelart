"""POST /api/export — generate a printable PDF from the matched grid.

Thin HTTP wrapper around core.pdf_exporter.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..schemas import ExportRequest

# Ensure backend/ is on sys.path so core imports work from any cwd.
_backend_dir = Path(__file__).resolve().parents[2]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from core.pdf_exporter import generate_pdf  # noqa: E402
from core.palette_matcher import validate_palette  # noqa: E402

router = APIRouter(prefix="/api", tags=["export"])


@router.post("/export")
def export_pdf(body: ExportRequest) -> Response:
    """Generate a printable PDF from the matched index grid.

    Accepts a JSON body with ``grid``, ``palette``, and optional
    ``cell_size_mm``.  Returns the PDF as ``application/pdf`` bytes.

    Returns HTTP 422 if the grid or palette is empty/invalid.
    """
    # ------------------------------------------------------------------
    # Validate palette
    # ------------------------------------------------------------------
    try:
        validate_palette(body.palette)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # ------------------------------------------------------------------
    # Validate grid indices are in range
    # ------------------------------------------------------------------
    palette_len = len(body.palette)
    for row_idx, row in enumerate(body.grid):
        for col_idx, idx in enumerate(row):
            if idx < 0 or idx >= palette_len:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Grid index {idx} at [{row_idx}][{col_idx}] "
                        f"is out of range for palette of size {palette_len}"
                    ),
                )

    # ------------------------------------------------------------------
    # Generate PDF
    # ------------------------------------------------------------------
    try:
        pdf_bytes = generate_pdf(
            grid=body.grid,
            palette=body.palette,
            cell_size_mm=body.cell_size_mm,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=pixelart-grid.pdf",
        },
    )
