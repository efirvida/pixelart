"""Palette matching: CIELAB conversion and ΔE2000 nearest-neighbor.

Pure functions — no FastAPI or HTTP dependencies. This module is
independently testable with colour-science and numpy installed.
"""

from __future__ import annotations

import re
from typing import List, Tuple

import colour
import numpy as np

RGB = Tuple[int, int, int]
Lab = Tuple[float, float, float]
IndexGrid2D = List[List[int]]
RGBGrid2D = List[List[RGB]]

HEX_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
MAX_PALETTE_SIZE = 10


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_palette(palette: List[str]) -> None:
    """Validate a palette list in-place; raises ``ValueError`` on failure.

    Checks:
    * At least one color
    * At most ``MAX_PALETTE_SIZE`` (10) colors
    * Every entry matches the ``#RRGGBB`` hex pattern

    Args:
        palette: List of hex color strings.

    Raises:
        ValueError: If any validation rule is violated.
    """
    if not palette:
        raise ValueError("Palette must contain at least one color")

    if len(palette) > MAX_PALETTE_SIZE:
        raise ValueError(
            f"Palette exceeds maximum of {MAX_PALETTE_SIZE} colors "
            f"(got {len(palette)})"
        )

    for i, hex_color in enumerate(palette):
        if not HEX_PATTERN.match(hex_color):
            raise ValueError(
                f"Invalid hex color at index {i}: '{hex_color}'. "
                f"Expected format: #RRGGBB"
            )


# ---------------------------------------------------------------------------
# Color-space conversions
# ---------------------------------------------------------------------------


def hex_to_rgb(hex_color: str) -> RGB:
    """Convert a ``#RRGGBB`` hex string to an ``(R, G, B)`` tuple."""
    clean = hex_color.lstrip("#")
    return (
        int(clean[0:2], 16),
        int(clean[2:4], 16),
        int(clean[4:6], 16),
    )


def rgb_to_lab(rgb: RGB) -> Lab:
    """Convert an 8-bit ``(R, G, B)`` tuple to CIELAB ``(L*, a*, b*)``.

    Internally normalises to [0, 1], converts to CIE XYZ via the sRGB
    transfer function, and then to CIE Lab using the D65 illuminant.
    """
    rgb_norm = np.array(rgb, dtype=np.float64) / 255.0
    xyz = colour.sRGB_to_XYZ(rgb_norm)
    lab = colour.XYZ_to_Lab(xyz)
    return (float(lab[0]), float(lab[1]), float(lab[2]))


def delta_e_2000(lab1: Lab, lab2: Lab) -> float:
    """Compute the CIE ΔE2000 colour difference between two CIELAB values."""
    return float(colour.delta_E(lab1, lab2, method="CIE 2000"))


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------


def nearest_palette_color(
    pixel_rgb: RGB,
    palette_rgb: List[RGB],
) -> int:
    """Return the index of the palette colour nearest to *pixel_rgb*.

    Distances are measured with ΔE2000 in CIELAB space.  Ties are
    broken by lower palette index (deterministic).

    Args:
        pixel_rgb: The cell colour to match.
        palette_rgb: List of palette colours as RGB tuples.

    Returns:
        0-based palette index.
    """
    pixel_lab = rgb_to_lab(pixel_rgb)

    best_idx = 0
    best_dist = float("inf")

    for idx, prgb in enumerate(palette_rgb):
        d = delta_e_2000(pixel_lab, rgb_to_lab(prgb))
        if d < best_dist:
            best_dist = d
            best_idx = idx

    return best_idx


def match_grid(
    grid_2d: RGBGrid2D,
    palette_hex: List[str],
) -> IndexGrid2D:
    """Map every cell of *grid_2d* to its nearest palette colour index.

    Args:
        grid_2d: 2-D list of ``(R, G, B)`` tuples from the image pipeline.
        palette_hex: User-supplied palette as ``#RRGGBB`` strings.

    Returns:
        2-D list of palette indices with the same row/column structure.
    """
    validate_palette(palette_hex)
    palette_rgb = [hex_to_rgb(h) for h in palette_hex]

    return [
        [nearest_palette_color(cell, palette_rgb) for cell in row]
        for row in grid_2d
    ]
