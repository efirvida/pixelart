"""POST /api/upload — accept an image + palette, return matched grid.

Thin HTTP wrapper around core.image_pipeline and core.palette_matcher.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..schemas import Dimensions, MatchRequest, UploadResponse

# Ensure backend/ is on sys.path so core imports work from any cwd.
_backend_dir = Path(__file__).resolve().parents[2]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from core.image_pipeline import pipeline  # noqa: E402
from core.palette_matcher import match_grid  # noqa: E402
from core.palette_matcher import validate_palette  # noqa: E402

router = APIRouter(prefix="/api", tags=["upload"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
})


@router.post("/upload", response_model=UploadResponse)
async def upload_image(
    file: Annotated[UploadFile, File(description="Raster image (JPEG, PNG, WebP)")] = None,  # noqa: B008
    palette: Annotated[str, Form(description="JSON array of hex colour strings")] = None,  # noqa: B008
    grid_size: Annotated[int, Form(ge=1, le=200, description="Target grid size")] = 29,  # noqa: B008
    crop_x: Annotated[int, Form(ge=0, description="Crop origin X in natural pixels")] = 0,  # noqa: B008
    crop_y: Annotated[int, Form(ge=0, description="Crop origin Y in natural pixels")] = 0,  # noqa: B008
    crop_size: Annotated[int, Form(ge=0, description="Crop square side (0 = centre crop)")] = 0,  # noqa: B008
) -> UploadResponse:
    """Process a raster image through the pixel-reducer pipeline.

    Accepts a multipart form with:
    - ``file``: the image file (JPEG, PNG, or WebP)
    - ``palette``: a JSON-encoded list of ``#RRGGBB`` hex strings
    - ``grid_size``: optional integer (default 29, max 200)
    - ``crop_x``, ``crop_y``, ``crop_size``: optional crop square in natural px
      (when crop_size=0 the full image is centre-cropped to square)
    """
    # ------------------------------------------------------------------
    # Guard: required fields
    # ------------------------------------------------------------------
    if file is None:
        raise HTTPException(status_code=422, detail="Missing required field: file")
    if palette is None:
        raise HTTPException(status_code=422, detail="Missing required field: palette")

    # ------------------------------------------------------------------
    # 1. Read file content
    # ------------------------------------------------------------------
    content = await file.read()

    # ------------------------------------------------------------------
    # 2. File-size validation (HTTP 413)
    # ------------------------------------------------------------------
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )

    # ------------------------------------------------------------------
    # 3. Content-type guard (HTTP 415)
    # ------------------------------------------------------------------
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {file.content_type}. "
            f"Allowed: JPEG, PNG, WebP",
        )

    # ------------------------------------------------------------------
    # 4. Parse palette JSON
    # ------------------------------------------------------------------
    try:
        palette_list: list[str] = json.loads(palette)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid palette JSON: {exc}",
        ) from exc

    if not isinstance(palette_list, list):
        raise HTTPException(
            status_code=422,
            detail="palette must be a JSON array of hex strings",
        )

    # ------------------------------------------------------------------
    # 5. Validate palette
    # ------------------------------------------------------------------
    try:
        validate_palette(palette_list)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # ------------------------------------------------------------------
    # 6. Image pipeline (ingest → crop → resize → extract)
    # ------------------------------------------------------------------
    try:
        rgb_grid = pipeline(content, grid_size=grid_size, crop_x=crop_x, crop_y=crop_y, crop_size=crop_size)
    except ValueError as exc:
        msg = str(exc)
        # Map to appropriate HTTP status:
        #   "Unsupported" / format → 415
        #   "Corrupt"              → 422
        if "unsupported" in msg.lower() or "format" in msg.lower():
            raise HTTPException(status_code=415, detail=msg) from exc
        raise HTTPException(status_code=422, detail=msg) from exc

    # ------------------------------------------------------------------
    # 7. Palette matching
    # ------------------------------------------------------------------
    try:
        index_grid = match_grid(rgb_grid, palette_list)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # ------------------------------------------------------------------
    # 8. Build response
    # ------------------------------------------------------------------
    height = len(index_grid)
    width = len(index_grid[0]) if height > 0 else 0

    return UploadResponse(
        grid=index_grid,
        palette=palette_list,
        dimensions=Dimensions(width=width, height=height),
    )


@router.post("/match", response_model=UploadResponse)
async def match_pixels(request: MatchRequest) -> UploadResponse:
    """Accept pre-processed RGB pixel grid, return palette-matched indices.

    The frontend handles steps 1-6 of the pipeline (ingest, grayscale,
    contrast, crop, resize, extract). This endpoint only does step 7:
    CIELAB Delta-E-2000 palette matching via :func:`match_grid`.
    """
    # Size ceiling
    height = len(request.grid)
    if height == 0:
        raise HTTPException(status_code=422, detail="Grid must not be empty")
    width = len(request.grid[0])
    if width == 0:
        raise HTTPException(status_code=422, detail="Grid must not be empty")
    if height > 200 or width > 200:
        raise HTTPException(
            status_code=413,
            detail=f"Grid dimensions {width}x{height} exceed maximum 200x200",
        )

    # Palette validation
    try:
        validate_palette(request.palette)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Grid-level RGB validation
    for r, row in enumerate(request.grid):
        for c, pixel in enumerate(row):
            if len(pixel) != 3:
                raise HTTPException(
                    status_code=422,
                    detail=f"Pixel at [{r}][{c}] has {len(pixel)} channels, expected 3",
                )
            for ch, val in enumerate(pixel):
                if not (0 <= val <= 255):
                    raise HTTPException(
                        status_code=422,
                        detail=f"Channel {ch} at [{r}][{c}] is {val}, expected 0-255",
                    )

    # Palette matching
    try:
        index_grid = match_grid(request.grid, request.palette)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    height_out = len(index_grid)
    width_out = len(index_grid[0]) if height_out > 0 else 0

    return UploadResponse(
        grid=index_grid,
        palette=request.palette,
        dimensions=Dimensions(width=width_out, height=height_out),
    )
