"""Tests for POST /api/upload — FastAPI TestClient.

Covers: valid upload, 413 oversized, 415 wrong type, 422 corrupt.
"""

from __future__ import annotations

import io
import json

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# The app lives in backend/api/main.py; the test runner runs from
# the repo root with `pytest tests/` and pyproject.toml points
# testpaths + pythonpath correctly.
from backend.api.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    """Create an in-memory JPEG with the given dimensions."""
    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png_bytes(width: int = 100, height: int = 100) -> bytes:
    """Create an in-memory PNG with the given dimensions."""
    img = Image.new("RGBA", (width, height), color=(255, 0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_webp_bytes(width: int = 100, height: int = 100) -> bytes:
    """Create an in-memory WebP with the given dimensions."""
    img = Image.new("RGB", (width, height), color=(0, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    return buf.getvalue()


def _valid_palette_json() -> str:
    return json.dumps(["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFFFFF"])


# ---------------------------------------------------------------------------
# Valid uploads
# ---------------------------------------------------------------------------


class TestValidUpload:
    """Happy-path: valid images with valid palette should return 200."""

    def test_upload_jpeg(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")},
            data={
                "palette": _valid_palette_json(),
                "grid_size": "10",
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "grid" in body
        assert "palette" in body
        assert "dimensions" in body
        assert body["palette"] == json.loads(_valid_palette_json())
        # grid_size=10, 100×100 → 10×10
        dims = body["dimensions"]
        assert dims["width"] == 10
        assert dims["height"] == 10

    def test_upload_png(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.png", _make_png_bytes(), "image/png")},
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["dimensions"]["width"] > 0
        assert body["dimensions"]["height"] > 0

    def test_upload_webp(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.webp", _make_webp_bytes(), "image/webp")},
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 200, resp.text

    def test_default_grid_size(self):
        """When grid_size is omitted, default 29 is used."""
        resp = client.post(
            "/api/upload",
            files={"file": ("test.png", _make_png_bytes(100, 100), "image/png")},
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 200, resp.text
        dims = resp.json()["dimensions"]
        # 100×100 → resize to max 29 → 29×29
        assert dims["width"] == 29
        assert dims["height"] == 29


# ---------------------------------------------------------------------------
# 413 — File too large
# ---------------------------------------------------------------------------


class TestFileTooLarge413:
    """Files exceeding the 10 MB limit must return HTTP 413."""

    def test_oversized_file(self):
        # Create an image larger than 10 MB:
        # 2000×2000×3 ≈ 12 MB raw, JPEG compression will make it smaller.
        # Use a very large raw image to force the JPEG over 10 MB.
        img = Image.new("RGB", (3000, 2000), color=(128, 128, 128))
        buf = io.BytesIO()
        # Save with minimal compression so the file is huge
        img.save(buf, format="JPEG", quality=100)
        oversized = buf.getvalue()

        # If the JPEG is still under 10 MB, pad it (route checks raw bytes).
        if len(oversized) < 11 * 1024 * 1024:
            # Fallback: create a really large in-memory "image" by repetition
            # (the route will not be able to parse it, but the size check
            # runs *before* parsing, so 413 is still returned).
            oversized = b"\x00" * (11 * 1024 * 1024)

        resp = client.post(
            "/api/upload",
            files={
                "file": ("big.jpg", oversized, "image/jpeg"),
            },
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 413, resp.text


# ---------------------------------------------------------------------------
# 415 — Unsupported media type
# ---------------------------------------------------------------------------


class TestUnsupportedMediaType415:
    """Non-image or unsupported-format files must return HTTP 415."""

    def test_pdf_file(self):
        # Create a minimal PDF header to trigger the content-type guard
        pdf_bytes = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n" + b"x" * 100
        resp = client.post(
            "/api/upload",
            files={"file": ("doc.pdf", pdf_bytes, "application/pdf")},
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 415, resp.text

    def test_text_file(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("readme.txt", b"hello world", "text/plain")},
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 415, resp.text

    def test_no_content_type_but_invalid_bytes(self):
        """Bytes that Pillow can't decode → 415 or 422 depending on error."""
        resp = client.post(
            "/api/upload",
            files={"file": ("fake.jpg", b"not-an-image", "image/jpeg")},
            data={"palette": _valid_palette_json()},
        )
        # The content-type is image/jpeg but bytes are corrupt → 422
        assert resp.status_code in (415, 422), resp.text


# ---------------------------------------------------------------------------
# 422 — Unprocessable entity (corrupt image, bad palette, etc.)
# ---------------------------------------------------------------------------


class TestUnprocessableEntity422:
    """Corrupt images, invalid palettes, and missing fields must return 422."""

    def test_corrupt_image(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("bad.jpg", b"this is not a valid image at all", "image/jpeg")},
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 422, resp.text

    def test_invalid_palette_hex(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")},
            data={"palette": json.dumps(["#GGGGGG"])},
        )
        assert resp.status_code == 422, resp.text

    def test_empty_palette(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")},
            data={"palette": "[]"},
        )
        assert resp.status_code == 422, resp.text

    def test_missing_file(self):
        resp = client.post(
            "/api/upload",
            data={"palette": _valid_palette_json()},
        )
        assert resp.status_code == 422, resp.text

    def test_missing_palette(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")},
        )
        assert resp.status_code == 422, resp.text

    def test_palette_not_json(self):
        resp = client.post(
            "/api/upload",
            files={"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")},
            data={"palette": "not-json"},
        )
        assert resp.status_code == 422, resp.text
