"""PDF export: render matched grid + legend + coordinates to PDF.

Uses ReportLab for precise physical positioning.  Pure functions —
no FastAPI or HTTP dependencies.
"""

from __future__ import annotations

from collections import Counter
from io import BytesIO
from typing import Dict, List

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

IndexGrid2D = List[List[int]]

# Page constants
_LABEL_MARGIN = 10 * mm
_LEFT_MARGIN = _LABEL_MARGIN + 10 * mm
_LEGEND_TOP_GAP = 20 * mm
_LEGEND_ROW_H = 6 * mm
_SWATCH_SIZE = 4 * mm


def column_label(n: int) -> str:
    """Convert a 0-based column index to spreadsheet-style letter(s).

    ``0 → A``, ``25 → Z``, ``26 → AA``, ``27 → AB``, …
    """
    result: list[str] = []
    n += 1  # work in 1-based for the conversion loop
    while n > 0:
        n -= 1
        result.append(chr(ord("A") + (n % 26)))
        n //= 26
    return "".join(reversed(result))


def count_color_usage(
    grid: IndexGrid2D,
    palette_len: int,
) -> Dict[int, int]:
    """Count how many cells reference each palette index.

    All indices 0..*palette_len-1* are guaranteed a key (0 if unused).
    """
    counter: Counter = Counter()
    for row in grid:
        for cell in row:
            counter[cell] += 1

    usage: Dict[int, int] = {}
    for i in range(palette_len):
        usage[i] = counter.get(i, 0)
    return usage


def generate_pdf(
    grid: IndexGrid2D,
    palette: List[str],
    cell_size_mm: float = 5.0,
) -> bytes:
    """Produce a printable PDF with a colour-matched grid, legend, and
    column/row labels.

    Args:
        grid: 2-D list of palette indices (``grid[row][col]``).
        palette: Palette hex strings (``#RRGGBB``).
        cell_size_mm: Physical side length of each cell in millimetres.

    Returns:
        The PDF content as a byte string.

    Raises:
        ValueError: If the grid or palette is empty.
    """
    # --- validation ---------------------------------------------------------
    if not grid or not grid[0]:
        raise ValueError("Grid cannot be empty")
    if not palette:
        raise ValueError("Palette cannot be empty")

    rows = len(grid)
    cols = len(grid[0])
    cell_size = cell_size_mm * mm

    grid_width = cols * cell_size
    grid_height = rows * cell_size

    page_width, page_height = A4
    usable_w = page_width - _LEFT_MARGIN - 10 * mm
    usable_h = page_height - _LABEL_MARGIN - 10 * mm
    legend_h = len(palette) * _LEGEND_ROW_H

    # Pagination guard: if the grid is too wide or too tall (including
    # legend) we still produce output but clamp to A4 + emit a note in
    # the return bytes via PDF metadata.
    grid_too_big = grid_width > usable_w or (grid_height + legend_h + _LEGEND_TOP_GAP) > usable_h

    top_y = page_height - _LABEL_MARGIN - 10 * mm

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    if grid_too_big:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(
            _LEFT_MARGIN,
            top_y,
            "WARNING: Grid exceeds A4 page — result may be clipped.",
        )
        top_y -= 10 * mm

    # --- column labels (A, B, C, …) ----------------------------------------
    c.setFont("Helvetica", 6)
    for j in range(cols):
        label = column_label(j)
        x = _LEFT_MARGIN + j * cell_size + cell_size / 2
        y = top_y + 5 * mm
        c.drawCentredString(x, y, label)

    # --- grid cells ---------------------------------------------------------
    for i in range(rows):
        cell_y = top_y - (i + 1) * cell_size

        for j in range(cols):
            cell_x = _LEFT_MARGIN + j * cell_size

            idx = grid[i][j]
            hex_color = palette[idx]

            c.setFillColor(HexColor(hex_color))
            c.rect(cell_x, cell_y, cell_size, cell_size, fill=1, stroke=0)

            c.setStrokeColor("black")
            c.rect(cell_x, cell_y, cell_size, cell_size, fill=0, stroke=1)

        # --- row label (1, 2, …) ----------------------------------------
        c.setFillColor("black")
        label = str(i + 1)
        x = _LEFT_MARGIN - 7 * mm
        y = cell_y + cell_size / 2
        c.drawCentredString(x, y, label)

    # --- legend ------------------------------------------------------------
    usage = count_color_usage(grid, len(palette))
    legend_y = top_y - rows * cell_size - _LEGEND_TOP_GAP

    c.setFont("Helvetica-Bold", 8)
    c.setFillColor("black")
    c.drawString(_LEFT_MARGIN, legend_y + 2 * mm, "Color Legend")
    legend_y -= 6 * mm

    c.setFont("Helvetica", 7)
    for idx, hex_color in enumerate(palette):
        count = usage.get(idx, 0)

        # swatch
        c.setFillColor(HexColor(hex_color))
        c.rect(_LEFT_MARGIN, legend_y, _SWATCH_SIZE, _SWATCH_SIZE, fill=1, stroke=1)

        # text
        c.setFillColor("black")
        c.drawString(
            _LEFT_MARGIN + _SWATCH_SIZE + 2 * mm,
            legend_y + 1 * mm,
            f"{hex_color.upper()}  —  {count} cell{'s' if count != 1 else ''}",
        )
        legend_y -= _LEGEND_ROW_H

    # Metadata for printing at 100 %
    c.setAuthor("PixelArt Image Reducer")
    c.setTitle("Pixel Art Grid")
    c.setSubject(
        f"{rows}x{cols} grid — {cell_size_mm} mm cells "
        f"({cols * cell_size_mm:.0f}×{rows * cell_size_mm:.0f} mm)"
    )

    c.save()
    return buf.getvalue()
