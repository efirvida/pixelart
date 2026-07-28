"""PDF export: render matched grid + legend + coordinates to PDF.

Uses ReportLab for precise physical positioning.  Pure functions —
no FastAPI or HTTP dependencies.

Three export modes:

- ``grid-legend`` (default): grid + color legend (swatch, hex, count).
- ``grid-table``:           grid + coordinate table grouped by color.
- ``table-only``:           coordinate table only — no grid.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from io import BytesIO
from typing import Dict, List, Tuple

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

IndexGrid2D = List[List[int]]
ColorCoords = Dict[int, List[Tuple[int, int]]]

# Page constants
_LABEL_MARGIN = 10 * mm
_LEFT_MARGIN = _LABEL_MARGIN + 10 * mm
_LEGEND_TOP_GAP = 20 * mm
_LEGEND_ROW_H = 6 * mm
_SWATCH_SIZE = 4 * mm
_TABLE_BOTTOM_MARGIN = 15 * mm
_TABLE_ROW_H = 5 * mm
_TABLE_HEADER_H = 7 * mm


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


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_color_coords(grid: IndexGrid2D) -> ColorCoords:
    """Map each palette index → sorted list of (row, col) positions (1-based)."""
    coords: Dict[int, List[Tuple[int, int]]] = defaultdict(list)
    for i, row in enumerate(grid):
        for j, cell in enumerate(row):
            coords[cell].append((i + 1, j + 1))
    return {k: sorted(v) for k, v in coords.items()}


def _draw_grid(
    c: canvas.Canvas,
    grid: IndexGrid2D,
    palette: List[str],
    cell_size: float,
    top_y: float,
) -> float:
    """Draw the full grid with row/col labels.  Returns the Y at grid bottom."""
    rows = len(grid)
    cols = len(grid[0])

    # --- column labels (1, 2, 3, …) ----------------------------------------
    c.setFont("Helvetica", 6)
    for j in range(cols):
        label = str(j + 1)
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

    return top_y - rows * cell_size


def _draw_legend(
    c: canvas.Canvas,
    palette: List[str],
    usage: Dict[int, int],
    legend_y: float,
) -> None:
    """Draw the color legend: swatch + hex + count."""
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


def _draw_coordinate_table(
    c: canvas.Canvas,
    palette: List[str],
    color_coords: ColorCoords,
    left: float,
    top_y: float,
    usable_w: float,
    page_height: float,
) -> float:
    """Draw a coordinate table grouped by color with auto-pagination.

    Each color section shows the swatch, hex code, cell count, and a
    compact row-by-row list of columns where that colour appears.
    Returns the final Y position.
    """
    y = top_y

    for idx, hex_color in enumerate(palette):
        coords = color_coords.get(idx, [])
        count = len(coords)
        if count == 0:
            continue

        # --- page break if the section header won't fit --------------------
        if y - _TABLE_HEADER_H - _TABLE_ROW_H < _TABLE_BOTTOM_MARGIN:
            c.showPage()
            y = page_height - _TABLE_BOTTOM_MARGIN

        # --- colour header ------------------------------------------------
        c.setFillColor(HexColor(hex_color))
        c.rect(left, y - _SWATCH_SIZE / 2, _SWATCH_SIZE, _SWATCH_SIZE, fill=1, stroke=1)

        c.setFillColor("black")
        c.setFont("Helvetica-Bold", 8)
        info = f"{hex_color.upper()}  —  {count} celda{'s' if count != 1 else ''}"
        c.drawString(left + _SWATCH_SIZE + 2 * mm, y - 2, info)
        y -= _TABLE_HEADER_H

        # --- group coordinates by row -------------------------------------
        by_row: Dict[int, List[int]] = {}
        for r, col in coords:
            by_row.setdefault(r, []).append(col)

        c.setFont("Helvetica", 7)
        line_indent = left + 4 * mm
        max_line_w = usable_w - 4 * mm

        for row_num in sorted(by_row.keys()):
            if y - _TABLE_ROW_H < _TABLE_BOTTOM_MARGIN:
                c.showPage()
                y = page_height - _TABLE_BOTTOM_MARGIN
                c.setFont("Helvetica", 7)

            cols_list = by_row[row_num]
            line = f"Fila {row_num:2d}: {', '.join(str(c) for c in cols_list)}"

            # --- wrap long lines at comma boundaries -----------------------
            remaining = line
            while remaining:
                if c.stringWidth(remaining, "Helvetica", 7) <= max_line_w:
                    c.drawString(line_indent, y - 1, remaining)
                    remaining = ""
                else:
                    # find the last comma that fits
                    fitted = ""
                    for break_idx, ch in enumerate(remaining):
                        trial = fitted + ch
                        if c.stringWidth(trial, "Helvetica", 7) > max_line_w:
                            break
                        fitted = trial
                    # try to break at a comma
                    comma_pos = fitted.rfind(",")
                    if comma_pos > len(fitted) // 2:
                        c.drawString(line_indent, y - 1, fitted[:comma_pos])
                        remaining = "  " + fitted[comma_pos + 1:].strip()
                    else:
                        c.drawString(line_indent, y - 1, fitted)
                        remaining = "  " + remaining[len(fitted):].strip()
                    y -= _TABLE_ROW_H

                    if y - _TABLE_ROW_H < _TABLE_BOTTOM_MARGIN:
                        c.showPage()
                        y = page_height - _TABLE_BOTTOM_MARGIN
                        c.setFont("Helvetica", 7)

            y -= _TABLE_ROW_H

    return y


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_pdf(
    grid: IndexGrid2D,
    palette: List[str],
    cell_size_mm: float = 5.0,
    export_mode: str = "grid-legend",
) -> bytes:
    """Produce a printable PDF.

    Args:
        grid: 2-D list of palette indices (``grid[row][col]``).
        palette: Palette hex strings (``#RRGGBB``).
        cell_size_mm: Physical side length of each cell in millimetres.
        export_mode: ``"grid-legend"`` (default), ``"grid-table"``,
            or ``"table-only"``.

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

    page_width, page_height = A4
    usable_w = page_width - _LEFT_MARGIN - 10 * mm

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    # ---- TABLE-ONLY: no grid, just the coordinate table --------------------
    if export_mode == "table-only":
        top_y = page_height - _LABEL_MARGIN - 10 * mm

        # title
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(page_width / 2, top_y, "Color Reference Table")
        top_y -= 9 * mm

        c.setFont("Helvetica", 10)
        c.drawCentredString(
            page_width / 2,
            top_y,
            f"{rows}×{cols} grid  ·  {len(palette)} colors",
        )
        top_y -= 6 * mm
        c.setFont("Helvetica", 8)
        c.drawCentredString(
            page_width / 2,
            top_y,
            "Place each color at the listed coordinates without seeing the final image.",
        )
        top_y -= 14 * mm

        color_coords = _build_color_coords(grid)
        _draw_coordinate_table(c, palette, color_coords, _LEFT_MARGIN, top_y, usable_w, page_height)

        c.setAuthor("PixelArt Image Reducer")
        c.setTitle("Pixel Art — Color Reference Table")
        c.setSubject(f"{rows}x{cols} grid — {len(palette)} colors")

    # ---- GRID-LEGEND / GRID-TABLE: draw grid + legend or table -------------
    else:
        top_y = page_height - _LABEL_MARGIN - 10 * mm

        # pagination guard
        grid_width = cols * cell_size
        grid_height = rows * cell_size
        usable_h = page_height - _LABEL_MARGIN - 10 * mm
        legend_h = len(palette) * _LEGEND_ROW_H
        grid_too_big = (
            grid_width > usable_w
            or (grid_height + legend_h + _LEGEND_TOP_GAP) > usable_h
        )

        if grid_too_big:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(
                _LEFT_MARGIN,
                top_y,
                "WARNING: Grid exceeds A4 page — result may be clipped.",
            )
            top_y -= 10 * mm

        grid_bottom = _draw_grid(c, grid, palette, cell_size, top_y)

        if export_mode == "grid-legend":
            usage = count_color_usage(grid, len(palette))
            legend_y = grid_bottom - _LEGEND_TOP_GAP
            _draw_legend(c, palette, usage, legend_y)

        elif export_mode == "grid-table":
            color_coords = _build_color_coords(grid)
            table_y = grid_bottom - _LEGEND_TOP_GAP
            _draw_coordinate_table(
                c, palette, color_coords, _LEFT_MARGIN, table_y, usable_w, page_height
            )

        c.setAuthor("PixelArt Image Reducer")
        c.setTitle("Pixel Art Grid")
        c.setSubject(
            f"{rows}x{cols} grid — {cell_size_mm} mm cells "
            f"({cols * cell_size_mm:.0f}×{rows * cell_size_mm:.0f} mm)"
        )

    c.save()
    return buf.getvalue()
