# Delta for Preview Editor

## ADDED Requirements

### Requirement: Design System Integration

The GridEditor and ComparisonSlider SHALL be rebuilt using design-system primitives — no raw inline styles. All interactive controls use `<Button>`, `<IconButton>`, `<RangeSlider>`, and `<Card>` from the primitive library.

#### Scenario: GridEditor uses primitives

- GIVEN the GridEditor renders
- WHEN inspected
- THEN toolbar buttons use `<Button>`/`<IconButton>`, the container uses `<Card>`, and all styling references design tokens via CSS Modules

#### Scenario: ComparisonSlider uses primitives

- GIVEN the ComparisonSlider renders
- WHEN inspected
- THEN the slider handle uses `<RangeSlider>` or a custom element with `role="slider"` and design-token styling

### Requirement: Shared Canvas Render Module

The system SHALL extract a shared `src/lib/canvas-render.ts` module that both GridEditor and ComparisonSlider use for cell rendering. This module SHALL NOT alter the rendering output — it deduplicates existing logic.

#### Scenario: Single render source of truth

- GIVEN both GridEditor and ComparisonSlider need to render palette cells on a canvas
- WHEN either component renders
- THEN both import and call functions from `canvas-render.ts` — no duplicated render math

#### Scenario: Render output unchanged

- GIVEN the shared canvas-render module is in use
- WHEN the grid is rendered
- THEN pixel positions, cell sizes, and colors are identical to the pre-refactor output

#### Scenario: Canvas render is unit-testable

- GIVEN `canvas-render.ts` exports pure rendering functions
- WHEN tested in isolation (no DOM/canvas)
- THEN cell coordinates and color assignments can be verified via returned data structures

### Requirement: Preview Editor Accessibility

The editor features SHALL satisfy all accessibility spec requirements (focus, ARIA, keyboard navigation, live regions).

#### Scenario: Grid cells keyboard navigable

- GIVEN focus is on a grid cell
- WHEN arrow keys are pressed
- THEN focus moves to the adjacent cell in that direction

#### Scenario: Cell recolor via keyboard

- GIVEN focus is on a grid cell
- WHEN Enter or Space is pressed
- THEN the cell cycles to the next palette color

#### Scenario: Comparison slider keyboard control

- GIVEN focus is on the comparison slider handle
- WHEN Left/Right arrow keys are pressed
- THEN the slider position moves incrementally

#### Scenario: Recolor announced to live region

- GIVEN a cell is recolored (via click or keyboard)
- WHEN the cell updates
- THEN a live region announces "Cell [row, col] changed to [color name]"

### Requirement: Consistent Feedback States

The editor SHALL display loading, empty, and error states using design-system feedback primitives, consistent with the upload feature.

#### Scenario: Loading skeleton during render

- GIVEN grid data is being processed before first render
- WHEN the loading state is active
- THEN a `<Skeleton>` placeholder renders in the grid area

#### Scenario: Empty state before upload

- GIVEN no image has been uploaded yet
- WHEN the editor area renders
- THEN an `<EmptyState>` shows instructional text directing the user to upload an image

## MODIFIED Requirements

### Requirement: Responsive Layout

The editor SHALL render correctly on viewports from 360px to 1920px width using the app-shell `PageLayout` and `Section` components with CSS Modules.
(Previously: 768px–1920px range, inline styles, no layout component integration)

#### Scenario: Mobile viewport

- GIVEN a viewport of 360px width
- WHEN the editor renders within `PageLayout`
- THEN the grid and controls stack vertically with no horizontal overflow

#### Scenario: Tablet viewport

- GIVEN a viewport of 768px width
- WHEN the editor renders
- THEN the grid and controls are visible without horizontal overflow

#### Scenario: Desktop viewport

- GIVEN a viewport of 1280px or wider
- WHEN the editor renders within `PageLayout`
- THEN the grid and comparison slider display side-by-side
