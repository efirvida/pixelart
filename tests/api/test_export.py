"""Tests for POST /api/export — FastAPI TestClient.

Covers: valid PDF export, empty grid guard, missing palette guard,
Content-Type header, and grid index out-of-range.
"""

from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)

VALID_PALETTE = ["#FF0000", "#00FF00", "#0000FF"]
VALID_GRID = [[0, 1, 0], [1, 2, 1], [0, 1, 0]]


# ---------------------------------------------------------------------------
# Valid exports
# ---------------------------------------------------------------------------


class TestValidExport:
    """Happy-path: a valid grid + palette should return PDF bytes."""

    def test_export_returns_pdf(self):
        resp = client.post(
            "/api/export",
            json={
                "grid": VALID_GRID,
                "palette": VALID_PALETTE,
            },
        )
        assert resp.status_code == 200, resp.text
        assert resp.headers["content-type"] == "application/pdf"
        # PDF files start with %PDF-
        assert resp.content.startswith(b"%PDF-")

    def test_export_custom_cell_size(self):
        resp = client.post(
            "/api/export",
            json={
                "grid": VALID_GRID,
                "palette": VALID_PALETTE,
                "cell_size_mm": 10.0,
            },
        )
        assert resp.status_code == 200, resp.text

    def test_content_disposition_header(self):
        resp = client.post(
            "/api/export",
            json={
                "grid": VALID_GRID,
                "palette": VALID_PALETTE,
            },
        )
        assert "content-disposition" in resp.headers
        assert "pixelart-grid.pdf" in resp.headers["content-disposition"]


# ---------------------------------------------------------------------------
# Validation errors — 422
# ---------------------------------------------------------------------------


class TestExportValidation422:
    """Invalid input must return HTTP 422."""

    def test_empty_grid(self):
        resp = client.post(
            "/api/export",
            json={
                "grid": [],
                "palette": VALID_PALETTE,
            },
        )
        assert resp.status_code == 422, resp.text

    def test_empty_palette(self):
        resp = client.post(
            "/api/export",
            json={
                "grid": VALID_GRID,
                "palette": [],
            },
        )
        assert resp.status_code == 422, resp.text

    def test_missing_grid_field(self):
        resp = client.post(
            "/api/export",
            json={
                "palette": VALID_PALETTE,
            },
        )
        assert resp.status_code == 422, resp.text

    def test_missing_palette_field(self):
        resp = client.post(
            "/api/export",
            json={
                "grid": VALID_GRID,
            },
        )
        assert resp.status_code == 422, resp.text

    def test_grid_index_out_of_range(self):
        """Palette has 3 colors; index 5 is invalid."""
        resp = client.post(
            "/api/export",
            json={
                "grid": [[0, 5, 0]],
                "palette": VALID_PALETTE,
            },
        )
        assert resp.status_code == 422, resp.text

    def test_invalid_hex_in_palette(self):
        resp = client.post(
            "/api/export",
            json={
                "grid": VALID_GRID,
                "palette": ["#GGGGGG"],
            },
        )
        assert resp.status_code == 422, resp.text

    def test_empty_json_body(self):
        resp = client.post("/api/export", json={})
        assert resp.status_code == 422, resp.text
