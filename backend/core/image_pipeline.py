"""Image pipeline: ingest, resize, extract pixels.

Pure functions — no FastAPI or HTTP dependencies. This module is
independently testable and importable by any Python 3.10+ runtime
with Pillow installed.
"""

from __future__ import annotations

import io
from typing import List, Tuple

import numpy as np
from PIL import Image

RGB = Tuple[int, int, int]
Grid2D = List[List[RGB]]
SUPPORTED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})
REJECTED_FORMATS = frozenset({"BMP", "TIFF"})


def ingest_image(data: bytes) -> Image.Image:
    """Decode raw image bytes and return a Pillow Image in RGB mode.

    Supports JPEG, PNG, and WebP. Rejects BMP, TIFF, and unreadable
    (corrupt / truncated) data with a descriptive ValueError.

    Args:
        data: Raw image file bytes.

    Returns:
        A Pillow Image object converted to RGB mode.

    Raises:
        ValueError: If the format is unsupported or the data is corrupt.
    """
    if not data:
        raise ValueError("Empty image data")

    try:
        img = Image.open(io.BytesIO(data))
    except Exception as exc:
        raise ValueError(f"Corrupt or unreadable image: {exc}") from exc

    # Force load to detect truly corrupt data (lazy-loading workaround)
    try:
        img.load()
    except Exception as exc:
        raise ValueError(f"Corrupt or unreadable image data: {exc}") from exc

    fmt = (img.format or "").upper()

    if fmt in REJECTED_FORMATS:
        raise ValueError(
            f"Unsupported image format: {fmt}. "
            f"Supported formats: JPEG, PNG, WebP"
        )

    if fmt not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported image format: {fmt or 'UNKNOWN'}. "
            f"Supported formats: JPEG, PNG, WebP"
        )

    try:
        return img.convert("RGB")
    except Exception as exc:
        raise ValueError(f"Failed to convert image to RGB: {exc}") from exc


def to_grayscale(image: Image.Image) -> Image.Image:
    """Convert an RGB image to perceptual grayscale.

    Uses ITU-R 601-2 luma: ``L = 0.299·R + 0.587·G + 0.114·B``.
    The returned image is RGB but every channel carries the same
    luminance value, so palette matching against gray-only palettes
    becomes a 1-D brightness comparison instead of a 3-D colour
    distance — far more accurate for B&W palettes.
    """
    gray = image.convert("L")       # single channel (luminance)
    return gray.convert("RGB")       # three identical channels


def stretch_contrast(image: Image.Image, low_pct: float = 1, high_pct: float = 99) -> Image.Image:
    """Stretch the luminance histogram so it fills the full 0–255 range.

    Saturates *low_pct*% of the darkest pixels to 0 and *high_pct*% of
    the brightest pixels to 255, then linearly stretches everything in
    between.  This ensures the palette gets pixels close to pure black
    and pure white even after the aggressive bicubic downscale.

    Args:
        image: RGB image (grayscale recommended — all channels equal).
        low_pct:  Percentile to clip at the dark end (default 1).
        high_pct: Percentile to clip at the bright end (default 99).

    Returns:
        RGB image with stretched contrast.
    """
    arr = np.array(image, dtype=np.float64)
    # Luminance (all channels are the same for grayscale input)
    lum = arr[:, :, 0]

    lo = np.percentile(lum, low_pct)
    hi = np.percentile(lum, high_pct)

    if hi - lo < 1:
        return image  # already flat, nothing to stretch

    stretched = np.clip((lum - lo) / (hi - lo) * 255, 0, 255)
    stacked = np.stack([stretched] * 3, axis=-1).astype(np.uint8)
    return Image.fromarray(stacked, mode="RGB")


def crop_square(image: Image.Image, crop_x: int = 0, crop_y: int = 0, crop_size: int = 0) -> Image.Image:
    """Crop a square region from the image.

    When *crop_size* is 0, the centre square of the image is used
    (backward-compatible default).

    Args:
        image: Pillow Image in RGB mode.
        crop_x: Left edge of the crop square in natural pixels.
        crop_y: Top edge of the crop square in natural pixels.
        crop_size: Side length of the crop square in natural pixels.

    Returns:
        A square Pillow Image of *crop_size*×*crop_size* pixels,
        or the centre square when *crop_size* is 0.
    """
    w, h = image.size

    if crop_size <= 0:
        # Centre crop (original default behaviour)
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        return image.crop((left, top, left + side, top + side))

    # Clamp to image bounds
    cw = min(crop_size, w - crop_x)
    ch = min(crop_size, h - crop_y)
    side = min(cw, ch)
    return image.crop((crop_x, crop_y, crop_x + side, crop_y + side))


def resize_to_grid(image: Image.Image, grid_size: int = 29) -> Image.Image:
    """Crop the image to a square (center) and resize to N×N.

    The board is always square (e.g., 29×29), so we crop the centre
    square of the image first, then resize to *grid_size*×*grid_size*.
    This ensures every cell in the physical board gets a mapped pixel
    regardless of the input aspect ratio.

    Args:
        image: Pillow Image in RGB mode.
        grid_size: Target side length in pixels (must be >= 1).

    Returns:
        A square Pillow Image of *grid_size*×*grid_size* pixels.

    Raises:
        ValueError: If *grid_size* is not positive.
    """
    if grid_size < 1:
        raise ValueError(
            f"grid_size must be a positive integer, got {grid_size}"
        )

    width, height = image.size
    if width == 0 or height == 0:
        raise ValueError("Image has zero dimension")

    # Crop centre square
    crop_side = min(width, height)
    left = (width - crop_side) // 2
    top = (height - crop_side) // 2
    cropped = image.crop((left, top, left + crop_side, top + crop_side))

    return cropped.resize((grid_size, grid_size), Image.BICUBIC)


def extract_pixels(image: Image.Image) -> Grid2D:
    """Extract every pixel from an image as a 2-D list of RGB tuples.

    Args:
        image: Pillow Image in RGB mode.

    Returns:
        A 2-D list indexed as ``grid[row][col]``, where each element
        is a ``(R, G, B)`` tuple with values 0–255.
    """
    pixels = image.load()
    width, height = image.size

    return [
        [pixels[x, y] for x in range(width)]
        for y in range(height)
    ]


def pipeline(
    data: bytes,
    grid_size: int = 29,
    crop_x: int = 0,
    crop_y: int = 0,
    crop_size: int = 0,
) -> Grid2D:
    """Full processing pipeline: ingest → grayscale → stretch → crop → resize → extract.

    Args:
        data: Raw image file bytes (JPEG, PNG, or WebP).
        grid_size: Target grid size (default 29).
        crop_x: Left edge of crop square in natural pixels.
        crop_y: Top edge of crop square in natural pixels.
        crop_size: Side length of crop in natural px (0 = centre crop).

    Returns:
        A 2-D list of ``(R, G, B)`` tuples.
    """
    image = ingest_image(data)
    gray = to_grayscale(image)
    contrasted = stretch_contrast(gray)
    cropped = crop_square(contrasted, crop_x, crop_y, crop_size)
    resized = resize_to_grid(cropped, grid_size)
    return extract_pixels(resized)
