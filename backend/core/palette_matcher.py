"""Palette matching: CIELAB conversion and ΔE2000 nearest-neighbor.

Pure functions — no FastAPI or HTTP dependencies. This module is
independently testable with colour-science and numpy installed.

The matching is fully vectorised with NumPy broadcasting for
performance with large grids and palettes.
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
MAX_PALETTE_SIZE = 50


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_palette(palette: List[str]) -> None:
    """Validate a palette list in-place; raises ``ValueError`` on failure.

    Checks:
    * At least one color
    * At most ``MAX_PALETTE_SIZE`` (50) colors
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


def _rgb_array_to_lab(rgb: np.ndarray) -> np.ndarray:
    """Convert an (N, 3) float64 RGB array (0-1 range) to CIELAB.

    Args:
        rgb: Array of shape (N, 3) with values in [0, 1].

    Returns:
        Array of shape (N, 3) with CIELAB (L*, a*, b*) values.
    """
    xyz = colour.sRGB_to_XYZ(rgb)
    return colour.XYZ_to_Lab(xyz)


def rgb_to_lab(rgb: RGB) -> Lab:
    """Convert an 8-bit ``(R, G, B)`` tuple to CIELAB ``(L*, a*, b*)``.

    Internally normalises to [0, 1], converts to CIE XYZ via the sRGB
    transfer function, and then to CIE Lab using the D65 illuminant.
    """
    rgb_norm = np.array(rgb, dtype=np.float64) / 255.0
    xyz = colour.sRGB_to_XYZ(rgb_norm)
    lab = colour.XYZ_to_Lab(xyz)
    return (float(lab[0]), float(lab[1]), float(lab[2]))


# ---------------------------------------------------------------------------
# Matching (vectorised)
# ---------------------------------------------------------------------------


def delta_e_2000(lab1: Lab, lab2: Lab) -> float:
    """Compute the CIE ΔE2000 colour difference between two CIELAB values.

    Args:
        lab1: First CIELAB colour as ``(L*, a*, b*)``.
        lab2: Second CIELAB colour as ``(L*, a*, b*)``.

    Returns:
        The ΔE2000 colour-difference value.
    """
    return float(colour.delta_E(
        np.array(lab1, dtype=np.float64),
        np.array(lab2, dtype=np.float64),
        method="CIE 2000",
    ))


def nearest_palette_color(
    pixel_lab: Lab,
    palette_lab: List[Lab],
) -> int:
    """Return the index of the palette colour nearest to *pixel_lab*.

    Legacy wrapper around the vectorised path. Kept for backward-
    compatible tests.

    Args:
        pixel_lab: The cell colour in CIELAB.
        palette_lab: Pre-computed palette colours in CIELAB.

    Returns:
        0-based palette index.
    """
    palette_arr = np.array(palette_lab, dtype=np.float64)  # (P, 3)
    pixel_arr = np.array(pixel_lab, dtype=np.float64)      # (3,)
    delta = colour.delta_E(
        pixel_arr[np.newaxis, :],
        palette_arr,
        method="CIE 2000",
    )
    return int(np.argmin(delta))


def match_grid(
    grid_2d: RGBGrid2D,
    palette_hex: List[str],
) -> IndexGrid2D:
    """Map every cell of *grid_2d* to its nearest palette colour index.

    Uses fully vectorised NumPy broadcasting for ΔE2000 computation,
    which is significantly faster than per-pixel loops for large grids
    and palettes.

    Args:
        grid_2d: 2-D list of ``(R, G, B)`` tuples from the image pipeline.
        palette_hex: User-supplied palette as ``#RRGGBB`` strings.

    Returns:
        2-D list of palette indices with the same row/column structure.
    """
    validate_palette(palette_hex)

    height = len(grid_2d)
    width = len(grid_2d[0])

    # --- Convert palette to CIELAB (once) -----------------------------------
    palette_rgb_float = np.array(
        [hex_to_rgb(h) for h in palette_hex], dtype=np.float64
    ) / 255.0
    palette_lab = _rgb_array_to_lab(palette_rgb_float)  # (P, 3)

    # --- Convert entire pixel grid to CIELAB --------------------------------
    pixels_rgb_float = np.array(grid_2d, dtype=np.float64) / 255.0  # (H, W, 3)
    pixels_flat = pixels_rgb_float.reshape(-1, 3)  # (N, 3)
    pixels_lab = _rgb_array_to_lab(pixels_flat)  # (N, 3)

    # --- Vectorised ΔE2000 with broadcasting --------------------------------
    # pixels_lab:  (N, 1, 3)
    # palette_lab: (1, P, 3)
    # delta_E:     (N, P)
    delta = colour.delta_E(
        pixels_lab[:, np.newaxis, :],
        palette_lab[np.newaxis, :, :],
        method="CIE 2000",
    )

    # Nearest palette index per pixel
    indices = np.argmin(delta, axis=1)  # (N,)

    return indices.reshape(height, width).tolist()
