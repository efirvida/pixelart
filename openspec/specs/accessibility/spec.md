# Accessibility Specification

## Purpose

Cross-cutting accessibility requirements that apply to ALL interactive components and pages. Every feature MUST satisfy these requirements. Verified via automated checks (axe-core / vitest-axe) and manual keyboard testing.

## Requirements

### Requirement: Focus Management

The system SHALL provide visible focus indicators on all interactive elements and manage focus flow during dynamic UI changes.

#### Scenario: Focus-visible on interactive elements

- GIVEN any interactive element (button, input, slider, link)
- WHEN the user navigates to it via keyboard (Tab/Shift+Tab)
- THEN a visible focus ring uses `var(--color-accent)` with minimum 2px width

#### Scenario: Focus trap in Modal

- GIVEN a `<Modal>` is open
- WHEN the user presses Tab repeatedly
- THEN focus cycles within modal interactive elements, not escaping to background

#### Scenario: Focus restoration on Modal close

- GIVEN a `<Modal>` was opened from a trigger button
- WHEN the modal closes
- THEN focus returns to the trigger button

#### Scenario: No focus on static content

- GIVEN non-interactive elements (text, images, cards without actions)
- WHEN the user tabs through the page
- THEN these elements do NOT receive focus

### Requirement: ARIA Semantics

The system SHALL assign appropriate ARIA roles, names, and states to all interactive and dynamic elements.

#### Scenario: Buttons have accessible names

- GIVEN a `<Button>` or `<IconButton>` is rendered
- WHEN an assistive technology queries it
- THEN it has an accessible name (from text content or `aria-label`)

#### Scenario: Slider has ARIA attributes

- GIVEN a `<RangeSlider>` or comparison slider
- WHEN queried by assistive technology
- THEN it exposes `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-label`

#### Scenario: Error states announced

- GIVEN a form field with a validation error
- WHEN rendered
- THEN the field has `aria-invalid="true"` and `aria-describedby` pointing to the error message element

#### Scenario: Loading states announced

- GIVEN a loading spinner or skeleton is displayed
- WHEN rendered
- THEN the container has `role="status"` and `aria-live="polite"` or the region has `aria-busy="true"`

### Requirement: Keyboard Navigation

The system SHALL make all interactive features fully operable via keyboard without requiring a mouse.

#### Scenario: Slider keyboard control

- GIVEN focus is on the comparison slider handle
- WHEN the user presses Left/Right arrow keys
- THEN the slider position moves incrementally left/right

#### Scenario: Grid editor keyboard navigation

- GIVEN focus is on a grid cell in the editor
- WHEN the user presses arrow keys
- THEN focus moves to the adjacent cell in that direction

#### Scenario: Grid cell recolor via keyboard

- GIVEN focus is on a grid cell
- WHEN the user presses Enter or Space
- THEN the cell cycles to the next palette color (same as click behavior)

#### Scenario: Escape closes overlays

- GIVEN a Modal or dropdown is open
- WHEN the user presses Escape
- THEN the overlay closes and focus returns to the trigger

### Requirement: Live-Region Announcements

The system SHALL use ARIA live regions to announce dynamic state changes that are not conveyed by focus movement.

#### Scenario: Upload progress announced

- GIVEN an image upload is in progress
- WHEN the upload completes or fails
- THEN a live region announces "Upload complete" or the error message

#### Scenario: Grid edit announced

- GIVEN the user recolored a grid cell
- WHEN the cell updates
- THEN a live region announces "Cell [row, col] changed to [color name]"

### Requirement: Color Contrast Verification

The system SHALL maintain WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text/UI) across all token color pairings.

#### Scenario: Automated contrast audit

- GIVEN the test suite runs
- WHEN the contrast audit executes
- THEN all text-on-background token pairs (e.g. `--color-text` on `--color-surface`) meet 4.5:1 ratio

#### Scenario: Interactive element contrast

- GIVEN button text on `--color-primary` background
- WHEN measured
- THEN the contrast ratio is ≥ 4.5:1
