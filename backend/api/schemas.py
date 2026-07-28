"""Pydantic models for the Image Pixel Reducer API.

These define the data shapes for upload requests, export requests,
and upload responses. Validation logic lives in the routes;
schemas are pure data carriers.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List

from pydantic import BaseModel, Field


class ExportMode(str, Enum):
    """Export layout modes for the PDF."""

    GRID_LEGEND = "grid-legend"
    """Grid + color legend (swatch, hex, count)."""
    GRID_TABLE = "grid-table"
    """Grid + coordinate table grouped by color."""
    TABLE_ONLY = "table-only"
    """Coordinate table only — no grid."""


class ExportRequest(BaseModel):
    """JSON body for POST /api/export.

    Accepts the matched grid (2-D list of palette indices), the palette
    hex strings, an optional physical cell size, and an export mode.
    """

    grid: List[List[int]] = Field(
        ...,
        description="2-D array of palette indices (grid[row][col])",
    )
    palette: List[str] = Field(
        ...,
        description="Palette hex strings in order (e.g. ['#FF0000', '#00FF00'])",
        min_length=1,
        max_length=10,
    )
    cell_size_mm: float = Field(
        5.0,
        ge=1.0,
        le=50.0,
        description="Physical side length of each cell in millimetres (default 5.0)",
    )
    export_mode: ExportMode = Field(
        ExportMode.GRID_LEGEND,
        description="Export layout: grid-legend, grid-table, or table-only",
    )


class Dimensions(BaseModel):
    """Grid dimensions returned in the upload response."""

    width: int
    height: int


class UploadResponse(BaseModel):
    """JSON body returned by POST /api/upload."""

    grid: List[List[int]] = Field(
        ...,
        description="2-D array of palette indices (grid[row][col])",
    )
    palette: List[str] = Field(
        ...,
        description="Palette hex strings in order",
    )
    dimensions: Dimensions = Field(
        ...,
        description="Grid width and height after resize",
    )


class MatchRequest(BaseModel):
    """JSON body for POST /api/match.

    Accepts a pre-processed NxN RGB pixel grid and a palette.
    The frontend handles steps 1-6 of the pipeline; this endpoint
    only does CIELAB Delta-E-2000 palette matching.
    """

    grid: List[List[List[int]]] = Field(
        ...,
        description="NxN array of [R, G, B] triples, each value 0-255",
    )
    palette: List[str] = Field(
        ...,
        description="Palette hex strings (max 10, #RRGGBB format)",
        min_length=1,
        max_length=10,
    )
