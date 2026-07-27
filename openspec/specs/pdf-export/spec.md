# PDF Export Specification

## Purpose

Renders the matched color grid into a printable PDF with a color legend, grid coordinates (row/column labels), and correct physical dimensions for the target board.

## Requirements

### Requirement: Grid Rendering

The system SHALL render the matched grid as a table of solid-colored cells in the PDF, with each cell sized to the configured physical dimension (default 5mm for a 29×29 grid on a 14.5×14.5cm board).

#### Scenario: Default grid PDF

- GIVEN a 29×29 matched grid with cell_size=5mm
- WHEN PDF export is called
- THEN the grid occupies exactly 145mm × 145mm in the output

#### Scenario: Custom cell size

- GIVEN a 29×29 grid with cell_size=10mm
- WHEN PDF export is called
- THEN the grid occupies 290mm × 290mm

### Requirement: Coordinate Labels

The system SHALL print row numbers (1–N) along the left edge and column letters (A–Z, AA–AZ…) along the top edge of the grid.

#### Scenario: 29×29 grid labels

- GIVEN a 29×29 grid
- WHEN PDF is generated
- THEN columns are labeled A–AC and rows are labeled 1–29

#### Scenario: Small grid labels

- GIVEN a 5×5 grid
- WHEN PDF is generated
- THEN columns are labeled A–E and rows 1–5

### Requirement: Color Legend

The system SHALL include a legend table listing each palette color with its hex code, assigned symbol/number, and total cell count.

#### Scenario: Legend with counts

- GIVEN a palette of 5 colors used in the grid
- WHEN PDF is generated
- THEN the legend shows 5 rows, each with color swatch, hex, and usage count

### Requirement: Printable at Actual Size

The system SHALL produce a PDF that prints at 1:1 physical scale on A4 paper without scaling artifacts.

#### Scenario: A4 print fidelity

- GIVEN a 29×29 grid (145×145mm) with 5mm cells
- WHEN printed on A4 at 100% scale
- THEN each cell measures 5mm ± 0.2mm with a ruler

### Requirement: Downloadable Output

The system SHALL return the PDF as a byte stream suitable for browser download or file save.

#### Scenario: PDF byte stream returned

- GIVEN a valid matched grid
- WHEN export is called
- THEN the system returns bytes with `Content-Type: application/pdf`

#### Scenario: Large grid pagination

- GIVEN a grid that exceeds one A4 page
- WHEN export is called
- THEN the system paginates across multiple pages or caps the grid size with a warning

### Requirement: Empty Palette Guard

The system SHALL reject PDF generation if no palette or matched grid is provided.

#### Scenario: Missing grid

- GIVEN no matched grid data
- WHEN export is called
- THEN the system returns a validation error
