"""Shared pytest fixtures for pixel-art tests."""

import io
import pytest
from PIL import Image


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Create a 580x580 RGB JPEG in memory."""
    img = Image.new("RGB", (580, 580), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def sample_png_bytes() -> bytes:
    """Create a 100x100 RGBA PNG in memory."""
    img = Image.new("RGBA", (100, 100), color=(255, 0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def sample_webp_bytes() -> bytes:
    """Create a 200x200 RGB WebP in memory."""
    img = Image.new("RGB", (200, 200), color=(0, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    return buf.getvalue()


@pytest.fixture
def sample_bmp_bytes() -> bytes:
    """Create a 50x50 RGB BMP in memory."""
    img = Image.new("RGB", (50, 50), color=(0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="BMP")
    return buf.getvalue()


@pytest.fixture
def sample_tiff_bytes() -> bytes:
    """Create a 50x50 RGB TIFF in memory."""
    img = Image.new("RGB", (50, 50), color=(0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="TIFF")
    return buf.getvalue()


@pytest.fixture
def corrupt_image_bytes() -> bytes:
    """Return bytes that are not a valid image."""
    return b"this is not an image at all, just raw bytes"


@pytest.fixture
def wide_image_bytes() -> bytes:
    """Create an 800x400 RGB JPEG in memory (2:1 aspect ratio)."""
    img = Image.new("RGB", (800, 400), color=(200, 150, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def sample_palette() -> list[str]:
    """Return a valid 5-color palette."""
    return ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFFFFF"]


@pytest.fixture
def sample_rgb_grid() -> list[list[tuple[int, int, int]]]:
    """Return a small 3x3 RGB grid for palette matching tests."""
    return [
        [(255, 0, 0), (0, 255, 0), (0, 0, 255)],
        [(255, 255, 0), (255, 255, 255), (128, 64, 32)],
        [(255, 0, 0), (0, 255, 0), (0, 0, 255)],
    ]


@pytest.fixture
def sample_index_grid() -> list[list[int]]:
    """Return a small 3x3 index grid."""
    return [[0, 1, 0], [1, 2, 1], [0, 1, 0]]
