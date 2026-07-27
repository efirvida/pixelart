"""Tests for palette_matcher — pure-function contract, no FastAPI imports."""

import sys
from pathlib import Path

import pytest

backend_dir = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(backend_dir))

from core.palette_matcher import (  # noqa: E402
    Lab,
    delta_e_2000,
    hex_to_rgb,
    match_grid,
    nearest_palette_color,
    rgb_to_lab,
    validate_palette,
)


# ---------------------------------------------------------------------------
# Palette validation
# ---------------------------------------------------------------------------


class TestValidatePalette:
    def test_valid_palette(self):
        validate_palette(["#FF0000", "#00FF00", "#0000FF"])

    def test_single_color(self):
        validate_palette(["#FFFFFF"])

    def test_max_colors(self):
        palette = [f"#{i:02X}{i:02X}{i:02X}" for i in range(10)]
        validate_palette(palette)

    def test_empty_palette(self):
        with pytest.raises(ValueError, match="at least one color"):
            validate_palette([])

    def test_exceeds_limit(self):
        palette = ["#000000"] * 11
        with pytest.raises(ValueError, match="exceeds maximum"):
            validate_palette(palette)

    def test_invalid_hex(self):
        with pytest.raises(ValueError, match="Invalid hex"):
            validate_palette(["#GGGGGG"])

    def test_short_hex(self):
        with pytest.raises(ValueError, match="Invalid hex"):
            validate_palette(["#FFF"])

    def test_no_hash(self):
        with pytest.raises(ValueError, match="Invalid hex"):
            validate_palette(["FF0000"])


# ---------------------------------------------------------------------------
# Colour conversions
# ---------------------------------------------------------------------------


class TestHexToRgb:
    def test_red(self):
        assert hex_to_rgb("#FF0000") == (255, 0, 0)

    def test_green(self):
        assert hex_to_rgb("#00FF00") == (0, 255, 0)

    def test_blue(self):
        assert hex_to_rgb("#0000FF") == (0, 0, 255)

    def test_white(self):
        assert hex_to_rgb("#FFFFFF") == (255, 255, 255)

    def test_black(self):
        assert hex_to_rgb("#000000") == (0, 0, 0)

    def test_lowercase(self):
        assert hex_to_rgb("#ff0000") == (255, 0, 0)


class TestRgbToLab:
    def test_pure_red(self):
        lab = rgb_to_lab((255, 0, 0))
        # Expected ≈ L=53.2, a=80.1, b=67.2  (±0.5 tolerance from spec)
        assert lab[0] == pytest.approx(53.2, abs=0.5)
        assert lab[1] == pytest.approx(80.1, abs=0.5)
        assert lab[2] == pytest.approx(67.2, abs=0.5)

    def test_black(self):
        lab = rgb_to_lab((0, 0, 0))
        assert lab[0] == pytest.approx(0.0, abs=0.1)

    def test_white(self):
        lab = rgb_to_lab((255, 255, 255))
        assert lab[0] == pytest.approx(100.0, abs=0.5)


class TestDeltaE2000:
    def test_identical_zero(self):
        lab = rgb_to_lab((255, 0, 0))
        assert delta_e_2000(lab, lab) == pytest.approx(0.0, abs=0.01)

    def test_different_positive(self):
        lab1 = rgb_to_lab((255, 0, 0))
        lab2 = rgb_to_lab((0, 255, 0))
        d = delta_e_2000(lab1, lab2)
        assert d > 1.0


# ---------------------------------------------------------------------------
# Nearest-neighbor matching
# ---------------------------------------------------------------------------


class TestNearestPaletteColor:
    def test_exact_match(self):
        """Cell RGB identical to palette[0] → index 0, ΔE ≈ 0."""
        palette_rgb = [
            hex_to_rgb("#FF0000"),
            hex_to_rgb("#00FF00"),
            hex_to_rgb("#0000FF"),
        ]
        idx = nearest_palette_color((255, 0, 0), palette_rgb)
        assert idx == 0

    def test_closest_selected(self):
        """Brownish pixel → closest should be brown, not red/green."""
        palette_rgb = [
            hex_to_rgb("#FF0000"),  # red
            hex_to_rgb("#00FF00"),  # green
            hex_to_rgb("#8B4513"),  # saddle brown
        ]
        idx = nearest_palette_color((128, 64, 32), palette_rgb)
        assert idx == 2  # brown

    def test_tie_breaking(self):
        """Equal ΔE2000 → lower index wins."""
        # Two identical palette entries; the first should be chosen.
        palette_rgb = [
            (128, 128, 128),
            (128, 128, 128),  # identical to [0]
        ]
        idx = nearest_palette_color((200, 200, 200), palette_rgb)
        assert idx == 0


# ---------------------------------------------------------------------------
# Full grid matching
# ---------------------------------------------------------------------------


class TestMatchGrid:
    def test_full_grid(self, sample_rgb_grid, sample_palette):
        result = match_grid(sample_rgb_grid, sample_palette)
        assert len(result) == 3
        assert len(result[0]) == 3
        for row in result:
            for cell in row:
                assert isinstance(cell, int)
                assert 0 <= cell < len(sample_palette)

    def test_exact_grid_match(self):
        """Cells that exactly match a palette color get that index."""
        grid = [
            [(255, 0, 0), (0, 255, 0)],
            [(0, 0, 255), (255, 255, 255)],
        ]
        palette = ["#FF0000", "#00FF00", "#0000FF", "#FFFFFF"]
        result = match_grid(grid, palette)
        assert result == [[0, 1], [2, 3]]

    def test_invalid_palette_raises(self, sample_rgb_grid):
        with pytest.raises(ValueError, match="Invalid hex"):
            match_grid(sample_rgb_grid, ["#GGGGGG"])
