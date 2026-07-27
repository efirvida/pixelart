# Palette Matching Specification

## Purpose

Maps each cell in the resized grid to the nearest color from a user-provided palette using CIELAB color space and ΔE2000 distance. Produces a grid of palette-assigned color indices.

## Requirements

### Requirement: User Palette Input

The system SHALL accept a palette of 1–10 user-defined colors as hex RGB strings (e.g., `#FF0000`).

#### Scenario: Valid palette provided

- GIVEN a list of 5 hex color strings
- WHEN the palette is loaded
- THEN the system stores the palette and returns a confirmation with color count

#### Scenario: Empty palette

- GIVEN an empty list
- WHEN the palette is loaded
- THEN the system rejects with a validation error requiring at least one color

#### Scenario: Palette exceeds limit

- GIVEN 15 colors
- WHEN the palette is loaded
- THEN the system rejects with a max-palette error

#### Scenario: Invalid hex string

- GIVEN a palette containing `#GGGGGG`
- WHEN the palette is loaded
- THEN the system rejects the invalid entry with a descriptive error

### Requirement: CIELAB Conversion

The system SHALL convert both the palette colors and each grid cell's RGB value to CIELAB color space before comparison.

#### Scenario: RGB to CIELAB conversion

- GIVEN an RGB value `(255, 0, 0)` (pure red)
- WHEN converted to CIELAB
- THEN the result is approximately L=53.2, a=80.1, b=67.2 (within ±0.5 tolerance)

### Requirement: Nearest-Neighbor Color Assignment

The system SHALL assign each grid cell the palette color with the smallest ΔE2000 distance in CIELAB space.

#### Scenario: Exact palette match

- GIVEN a cell with RGB identical to a palette color
- WHEN nearest-neighbor matching runs
- THEN the cell is assigned that exact palette color (ΔE = 0)

#### Scenario: Closest color selected

- GIVEN a cell RGB `(128, 64, 32)` and palette `[red, green, brown]`
- WHEN matching runs
- THEN the cell is assigned the palette color with minimum ΔE2000

#### Scenario: Tie-breaking

- GIVEN two palette colors with equal ΔE2000 distance to a cell
- WHEN matching runs
- THEN the system selects the first palette color by index order

### Requirement: Grid Output

The system SHALL return a 2D array where each cell contains the index (0-based) of the matched palette color.

#### Scenario: Full grid matched

- GIVEN a 29×29 RGB grid and a 5-color palette
- WHEN palette matching completes
- THEN the output is a 29×29 array of integers in range [0, 4]

#### Scenario: User override preserved

- GIVEN a cell previously overridden by the user in the editor
- WHEN the pipeline re-runs
- THEN the user override is NOT overwritten unless the user explicitly resets
