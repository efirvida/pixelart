"""Tests for image_pipeline — pure-function contract, no FastAPI imports."""

import sys
from pathlib import Path

import pytest

# Ensure backend/core is importable without FastAPI
backend_dir = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(backend_dir))

from core.image_pipeline import (  # noqa: E402
    Grid2D,
    SUPPORTED_FORMATS,
    ingest_image,
    pipeline,
    resize_to_grid,
    extract_pixels,
)


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------


class TestIngestImage:
    def test_ingest_valid_jpeg(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)
        assert img.mode == "RGB"
        assert img.size == (580, 580)

    def test_ingest_valid_png(self, sample_png_bytes):
        img = ingest_image(sample_png_bytes)
        assert img.mode == "RGB"
        assert img.size == (100, 100)

    def test_ingest_valid_webp(self, sample_webp_bytes):
        img = ingest_image(sample_webp_bytes)
        assert img.mode == "RGB"
        assert img.size == (200, 200)

    def test_reject_bmp(self, sample_bmp_bytes):
        with pytest.raises(ValueError, match="Unsupported.*BMP"):
            ingest_image(sample_bmp_bytes)

    def test_reject_tiff(self, sample_tiff_bytes):
        with pytest.raises(ValueError, match="Unsupported.*TIFF"):
            ingest_image(sample_tiff_bytes)

    def test_reject_corrupt(self, corrupt_image_bytes):
        with pytest.raises(ValueError, match="Corrupt"):
            ingest_image(corrupt_image_bytes)

    def test_reject_empty_data(self):
        with pytest.raises(ValueError, match="Empty"):
            ingest_image(b"")


# ---------------------------------------------------------------------------
# Resize
# ---------------------------------------------------------------------------


class TestResizeToGrid:
    def test_default_grid_size(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)  # 580×580
        resized = resize_to_grid(img, grid_size=29)
        assert resized.size == (29, 29)

    def test_custom_grid_size(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)
        resized = resize_to_grid(img, grid_size=50)
        assert resized.size == (50, 50)

    def test_non_square_image(self, wide_image_bytes):
        """800×400 → centre-crop 400×400 → 29×29 (square)."""
        img = ingest_image(wide_image_bytes)
        resized = resize_to_grid(img, grid_size=29)
        assert resized.size == (29, 29)

    def test_grid_size_zero(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)
        with pytest.raises(ValueError, match="must be a positive integer"):
            resize_to_grid(img, grid_size=0)

    def test_grid_size_negative(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)
        with pytest.raises(ValueError, match="must be a positive integer"):
            resize_to_grid(img, grid_size=-5)

    def test_grid_size_one(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)  # 580×580 → 1×1
        resized = resize_to_grid(img, grid_size=1)
        assert resized.size == (1, 1)

    def test_tall_image(self):
        """100×400 tall image → centre-crop 100×100 → 10×10 (square)."""
        from PIL import Image
        import io

        buf = io.BytesIO()
        Image.new("RGB", (100, 400)).save(buf, format="PNG")
        img = ingest_image(buf.getvalue())
        resized = resize_to_grid(img, grid_size=10)
        assert resized.size == (10, 10)


# ---------------------------------------------------------------------------
# Pixel extraction
# ---------------------------------------------------------------------------


class TestExtractPixels:
    def test_extract_29x29(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)
        resized = resize_to_grid(img, grid_size=29)
        pixels = extract_pixels(resized)
        assert len(pixels) == 29
        assert len(pixels[0]) == 29
        # Every element is a 3-tuple of ints
        assert all(isinstance(v, int) for v in pixels[0][0])
        assert len(pixels[0][0]) == 3

    def test_extract_1x1(self, sample_image_bytes):
        img = ingest_image(sample_image_bytes)
        resized = resize_to_grid(img, grid_size=1)
        pixels = extract_pixels(resized)
        assert len(pixels) == 1
        assert len(pixels[0]) == 1
        # 1×1 bicubic downsample averages 580×580 pixels; exact RGB
        # is not deterministic, but the tuple must have 3 valid ints
        assert isinstance(pixels[0][0], tuple)
        assert len(pixels[0][0]) == 3
        for v in pixels[0][0]:
            assert isinstance(v, int)
            assert 0 <= v <= 255


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------


class TestPipeline:
    def test_end_to_end(self, sample_image_bytes):
        result = pipeline(sample_image_bytes, grid_size=29)
        assert isinstance(result, list)
        assert len(result) == 29
        assert len(result[0]) == 29
        assert isinstance(result[0][0], tuple)
        assert len(result[0][0]) == 3

    def test_no_fastapi_imports(self):
        """Core module MUST NOT import FastAPI."""
        import core.image_pipeline as ip

        mod_attrs = dir(ip)
        assert "FastAPI" not in mod_attrs
        # Verify we're not dragging in any starlette/fastapi by accident
        for attr in mod_attrs:
            assert "fastapi" not in attr.lower()


# ---------------------------------------------------------------------------
# Guard — no FastAPI in this test module
# ---------------------------------------------------------------------------

def test_no_fastapi_in_this_module():
    """Sanity check: this test file does not import FastAPI itself."""
    m = sys.modules[__name__]
    for name in dir(m):
        # Skip the test function's own name — it contains 'fastapi'
        # on purpose, but that's not what we're checking.
        if name == "test_no_fastapi_in_this_module":
            continue
        assert "fastapi" not in name.lower(), f"unexpected fastapi in {name}"
        assert "starlette" not in name.lower(), f"unexpected starlette in {name}"
