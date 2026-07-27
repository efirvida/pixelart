"""Tests for POST /api/match — FastAPI TestClient.

Covers: valid match, 422 validation, 413 oversized grid, performance.
"""

from __future__ import annotations

import json
import time
from typing import List

import pytest
from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _valid_palette() -> List[str]:
    return ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFFFFF"]


def _rgb_grid(size: int = 29, fill: List[int] | None = None) -> List[List[List[int]]]:
    """Build an N×N grid of [R,G,B] triples."""
    if fill is None:
        fill = [128, 128, 128]
    return [[list(fill) for _ in range(size)] for _ in range(size)]


def _make_payload(grid: List[List[List[int]]] | None = None, palette: List[str] | None = None) -> dict:
    return {
        "grid": grid if grid is not None else _rgb_grid(),
        "palette": palette if palette is not None else _valid_palette(),
    }


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestValidMatch:
    """Happy-path: valid grid + palette should return 200 with UploadResponse."""

    def test_29x29_returns_200(self):
        resp = client.post("/api/match", json=_make_payload())
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "grid" in body
        assert "palette" in body
        assert "dimensions" in body
        assert body["palette"] == _valid_palette()
        dims = body["dimensions"]
        assert dims["width"] == 29
        assert dims["height"] == 29
        # Grid should contain palette indices (ints)
        assert all(isinstance(idx, int) for row in body["grid"] for idx in row)

    def test_5x5_returns_200(self):
        resp = client.post("/api/match", json=_make_payload(grid=_rgb_grid(5)))
        assert resp.status_code == 200, resp.text
        assert resp.json()["dimensions"]["width"] == 5

    def test_200x200_returns_200(self):
        resp = client.post("/api/match", json=_make_payload(grid=_rgb_grid(200)))
        assert resp.status_code == 200, resp.text
        assert resp.json()["dimensions"]["width"] == 200

    def test_single_color_palette(self):
        resp = client.post(
            "/api/match",
            json=_make_payload(palette=["#ABCDEF"]),
        )
        assert resp.status_code == 200, resp.text

    def test_10_color_palette(self):
        palette = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF",
                   "#00FFFF", "#000000", "#FFFFFF", "#888888", "#ABCDEF"]
        resp = client.post("/api/match", json=_make_payload(palette=palette))
        assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------------------
# 413 — Grid too large
# ---------------------------------------------------------------------------


class TestGridTooLarge413:
    """Grids exceeding 200×200 must return HTTP 413."""

    def test_201x201(self):
        resp = client.post("/api/match", json=_make_payload(grid=_rgb_grid(201)))
        assert resp.status_code == 413, resp.text
        assert "200" in resp.json()["detail"]

    def test_500x500(self):
        resp = client.post("/api/match", json=_make_payload(grid=_rgb_grid(500)))
        assert resp.status_code == 413, resp.text


# ---------------------------------------------------------------------------
# 422 — Grid validation
# ---------------------------------------------------------------------------


class TestGridValidation422:
    """Invalid grid structure must return HTTP 422."""

    def test_empty_grid(self):
        resp = client.post("/api/match", json=_make_payload(grid=[]))
        assert resp.status_code == 422, resp.text

    def test_grid_too_small_3x3(self):
        resp = client.post("/api/match", json=_make_payload(grid=_rgb_grid(3)))
        assert resp.status_code == 422, resp.text

    def test_uneven_rows(self):
        grid = [[[128, 128, 128]] * 10, [[128, 128, 128]] * 9]  # row 0: 10, row 1: 9
        resp = client.post("/api/match", json=_make_payload(grid=grid))
        assert resp.status_code == 422, resp.text

    def test_pixel_with_two_channels(self):
        grid = [[[[128, 128]]]]  # 2 values instead of 3
        resp = client.post("/api/match", json=_make_payload(grid=grid))
        assert resp.status_code == 422, resp.text

    def test_rgb_out_of_range_negative(self):
        grid = [[[[-1, 128, 128]]]]
        resp = client.post("/api/match", json=_make_payload(grid=grid))
        assert resp.status_code == 422, resp.text

    def test_rgb_out_of_range_over_255(self):
        grid = [[[[256, 128, 128]]]]
        resp = client.post("/api/match", json=_make_payload(grid=grid))
        assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# 422 — Palette validation
# ---------------------------------------------------------------------------


class TestPaletteValidation422:
    """Invalid palette must return HTTP 422."""

    def test_empty_palette(self):
        resp = client.post("/api/match", json=_make_payload(palette=[]))
        assert resp.status_code == 422, resp.text

    def test_too_many_colors(self):
        palette = [f"#{i:06x}" for i in range(11)]
        resp = client.post("/api/match", json=_make_payload(palette=palette))
        assert resp.status_code == 422, resp.text

    def test_invalid_hex_short(self):
        resp = client.post("/api/match", json=_make_payload(palette=["#FFF"]))
        assert resp.status_code == 422, resp.text

    def test_invalid_hex_named_color(self):
        resp = client.post("/api/match", json=_make_payload(palette=["red"]))
        assert resp.status_code == 422, resp.text

    def test_invalid_hex_bad_chars(self):
        resp = client.post("/api/match", json=_make_payload(palette=["#GGGGGG"]))
        assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# Performance
# ---------------------------------------------------------------------------


class TestPerformance:
    """Matching must complete within 2 seconds for a 29×29 grid."""

    def test_29x29_under_2_seconds(self):
        start = time.perf_counter()
        resp = client.post("/api/match", json=_make_payload())
        elapsed = time.perf_counter() - start
        assert resp.status_code == 200, resp.text
        assert elapsed < 2.0, f"Matching took {elapsed:.2f}s, expected < 2.0s"


# ---------------------------------------------------------------------------
# Backward compatibility
# ---------------------------------------------------------------------------


class TestBackwardCompatibility:
    """POST /api/upload must still work after adding /api/match."""

    def test_upload_still_works(self):
        import io
        from PIL import Image

        img = Image.new("RGB", (100, 100), color=(128, 64, 32))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        jpeg_bytes = buf.getvalue()

        resp = client.post(
            "/api/upload",
            files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")},
            data={
                "palette": json.dumps(["#FF0000", "#00FF00", "#0000FF"]),
                "grid_size": "10",
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["dimensions"]["width"] == 10
