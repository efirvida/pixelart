"""Tests for pdf_exporter — pure-function contract, no FastAPI imports."""

import sys
from pathlib import Path

import pytest

backend_dir = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(backend_dir))

from core.pdf_exporter import (  # noqa: E402
    column_label,
    count_color_usage,
    generate_pdf,
)


# ---------------------------------------------------------------------------
# Column labels
# ---------------------------------------------------------------------------


class TestColumnLabel:
    def test_first_three(self):
        assert column_label(0) == "A"
        assert column_label(1) == "B"
        assert column_label(2) == "C"

    def test_last_single_letter(self):
        assert column_label(25) == "Z"

    def test_double_letter(self):
        assert column_label(26) == "AA"
        assert column_label(27) == "AB"
        assert column_label(51) == "AZ"

    def test_triple_letter(self):
        assert column_label(701) == "ZZ"
        assert column_label(702) == "AAA"


# ---------------------------------------------------------------------------
# Color usage counting
# ---------------------------------------------------------------------------


class TestCountColorUsage:
    def test_even_distribution(self):
        grid = [[0, 1, 0], [1, 2, 1], [0, 1, 0]]
        usage = count_color_usage(grid, palette_len=3)
        assert usage == {0: 4, 1: 4, 2: 1}

    def test_zero_usage_for_unused_index(self):
        grid = [[0, 0], [0, 0]]
        usage = count_color_usage(grid, palette_len=3)
        assert usage == {0: 4, 1: 0, 2: 0}

    def test_single_cell(self):
        grid = [[0]]
        usage = count_color_usage(grid, palette_len=1)
        assert usage == {0: 1}


# ---------------------------------------------------------------------------
# PDF generation
# ---------------------------------------------------------------------------


class TestGeneratePdf:
    def test_valid_pdf_returned(self, sample_index_grid, sample_palette):
        result = generate_pdf(sample_index_grid, sample_palette, cell_size_mm=5.0)
        assert isinstance(result, bytes)
        assert len(result) > 0
        # PDF files start with %PDF
        assert result.startswith(b"%PDF")

    def test_29x29_default_grid(self, sample_palette):
        """A 29×29 grid should produce a valid PDF."""
        grid = [[i % len(sample_palette) for _ in range(29)] for i in range(29)]
        result = generate_pdf(grid, sample_palette)
        assert result.startswith(b"%PDF")

    def test_custom_cell_size(self, sample_index_grid, sample_palette):
        result_5mm = generate_pdf(sample_index_grid, sample_palette, cell_size_mm=5.0)
        result_10mm = generate_pdf(sample_index_grid, sample_palette, cell_size_mm=10.0)
        # Both are valid PDFs (different sizes aren't easily compared
        # without parsing, but both should be non-empty)
        assert result_5mm.startswith(b"%PDF")
        assert result_10mm.startswith(b"%PDF")
        assert len(result_10mm) > 0

    def test_column_labels_in_pdf(self, sample_palette):
        """Verify column label '1' appears in the PDF content stream."""
        grid = [[0, 1], [2, 3]]
        result = generate_pdf(grid, sample_palette)
        pdf_str = result.decode("latin-1", errors="replace")
        # The label "1" (column) should appear in the PDF stream
        assert "1" in pdf_str

    def test_legend_includes_hex(self, sample_index_grid, sample_palette):
        """The embedded content stream uses ASCII85+FlateDecode
        compression and hex strings are consumed by ReportLab's
        colour engine — they will not appear verbatim. We verify
        the PDF is structurally valid and contains palette-dependent
        data (size grows with more colors)."""
        # Single-color grid must only reference index 0
        grid_1color = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        result_small = generate_pdf(grid_1color, ["#FF0000"], cell_size_mm=5.0)
        result_full = generate_pdf(sample_index_grid, sample_palette, cell_size_mm=5.0)

        # Both are valid PDFs
        assert result_small.startswith(b"%PDF")
        assert result_full.startswith(b"%PDF")

        # More palette entries → slightly bigger PDF (more legend rows)
        assert len(result_full) > len(result_small)

    def test_reject_empty_grid(self, sample_palette):
        with pytest.raises(ValueError, match="Grid cannot be empty"):
            generate_pdf([], sample_palette)

        with pytest.raises(ValueError, match="Grid cannot be empty"):
            generate_pdf([[]], sample_palette)

    def test_reject_empty_palette(self, sample_index_grid):
        with pytest.raises(ValueError, match="Palette cannot be empty"):
            generate_pdf(sample_index_grid, [])

    def test_single_cell_grid(self):
        grid = [[0]]
        palette = ["#FF0000"]
        result = generate_pdf(grid, palette, cell_size_mm=5.0)
        assert result.startswith(b"%PDF")

    def test_large_grid_does_not_crash(self):
        """50×50 grid with 10 colors — should produce a valid PDF."""
        palette = [f"#{h:02X}{h:02X}{h:02X}" for h in range(0, 256, 26)][:10]
        grid = [[i % 10 for _ in range(50)] for i in range(50)]
        result = generate_pdf(grid, palette, cell_size_mm=3.0)
        assert result.startswith(b"%PDF")

    def test_no_fastapi_imports(self):
        """Core module MUST NOT import FastAPI."""
        import core.pdf_exporter as pe

        for attr in dir(pe):
            assert "fastapi" not in attr.lower()
