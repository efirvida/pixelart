# Preview Editor Specification

## Purpose

Provides a React-based interactive grid preview where users can inspect the palette-matched result, recolor individual cells, and compare the original image against the grid output.

## Requirements

### Requirement: Grid Preview Rendering

The system SHALL render the matched palette grid as a visual canvas/SVG where each cell displays its assigned color.

#### Scenario: Grid renders from matched data

- GIVEN a 29×29 matched grid with palette colors
- WHEN the editor component mounts
- THEN a 29×29 colored grid is visible on screen

#### Scenario: Grid updates on data change

- GIVEN the editor is displaying a grid
- WHEN new matched grid data arrives from the API
- THEN the grid re-renders with the new data without full page reload

### Requirement: Click-to-Recolor

The system SHALL allow the user to click any cell and cycle it through the available palette colors.

#### Scenario: Click cycles color

- GIVEN a cell currently showing palette color index 0
- WHEN the user clicks the cell
- THEN the cell updates to palette color index 1

#### Scenario: Recolor persists in state

- GIVEN a cell the user recolored
- WHEN the user triggers PDF export
- THEN the PDF reflects the user's manual color choice, not the auto-matched result

#### Scenario: Undo last recolor

- GIVEN a cell the user just recolored
- WHEN the user presses Ctrl+Z (or clicks an undo button if provided)
- THEN the cell reverts to its previous color

### Requirement: Before/After Comparison Slider

The system SHALL provide a draggable vertical slider that overlays the original uploaded image against the palette-matched grid.

#### Scenario: Slider shows before/after

- GIVEN the user has uploaded an image and the grid is matched
- WHEN the comparison slider is visible
- THEN the left side shows the original image and the right side shows the grid

#### Scenario: Slider is draggable

- GIVEN the comparison slider is rendered
- WHEN the user drags the divider left or right
- THEN the visible ratio of original vs. grid updates smoothly

#### Scenario: Slider syncs with grid edits

- GIVEN the user recolored several cells
- WHEN the comparison slider is used
- THEN the "after" side reflects all manual edits, not the initial auto-match

### Requirement: Responsive Layout

The editor SHALL render correctly on viewports from 768px to 1920px width.

#### Scenario: Tablet viewport

- GIVEN a viewport of 768px width
- WHEN the editor renders
- THEN the grid and controls are visible without horizontal overflow

### Requirement: No Backend Dependency for Rendering

The editor SHALL render the grid from in-memory state; recoloring cells SHALL NOT require a server round-trip.

#### Scenario: Offline recolor

- GIVEN the user is editing cells with no network connection
- WHEN cells are recolored
- THEN the changes appear immediately in the UI
