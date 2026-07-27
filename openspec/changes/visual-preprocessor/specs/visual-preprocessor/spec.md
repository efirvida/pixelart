# Visual Preprocessor Specification

## Purpose

Canvas API–based image preprocessing pipeline with live preview. Runs steps 1–6 of the image pipeline in the browser (ingest, grayscale, brightness/contrast/saturation, crop, resize, dithering, RGB extraction). Sends an N×N RGB grid to `POST /api/match` for CIELAB ΔE2000 palette matching. Zero new npm dependencies.

## Requirements

### Requirement: File Selection

The system SHALL provide a drag-and-drop zone and click-to-browse file picker accepting JPEG, PNG, and WebP images. The selected file SHALL be decoded via `FileReader` → `new Image()` → `canvas.drawImage()` and displayed on the preview canvas.

#### Scenario: Drag-and-drop image load

- GIVEN the preprocessor is rendered with no image loaded
- WHEN the user drags a valid JPEG onto the drop zone
- THEN the image renders on the preview canvas with current filters applied
- AND all control values reset to defaults

#### Scenario: Click-to-browse image load

- GIVEN the preprocessor is rendered
- WHEN the user clicks the file input and selects a PNG
- THEN the image renders on the preview canvas

#### Scenario: Oversized image rejected

- GIVEN an image exceeding 6000×6000 pixels
- WHEN the user attempts to load it
- THEN a `<Toast variant="error">` displays "Image too large (max 6000×6000)"
- AND the preview canvas remains empty

#### Scenario: Invalid file type rejected

- GIVEN a `.pdf` or `.txt` file
- WHEN the user attempts to load it
- THEN a `<Toast variant="error">` displays "Unsupported file format"

### Requirement: Live Canvas Preview

The system SHALL render the source image with all active filters applied in real time on a `<canvas>` element constrained to max 600×600 CSS px. Filter changes SHALL update the preview within 100ms for images under 4000px on either axis.

#### Scenario: Preview updates on slider change

- GIVEN an image is loaded and brightness is at 0
- WHEN the user moves the brightness slider to +50
- THEN the canvas preview reflects the brighter image within 100ms

#### Scenario: Multiple filters compose

- GIVEN an image with grayscale ON, brightness +30, saturation 150%
- WHEN the preview renders
- THEN all three filters are visible simultaneously on the canvas

### Requirement: Grayscale Toggle

The system SHALL provide a toggle that converts the preview to grayscale using ITU-R 601-2 luminance: `L = 0.299·R + 0.587·G + 0.114·B`, replicating L across all three RGB channels.

#### Scenario: Grayscale enabled

- GIVEN an image is loaded with grayscale OFF
- WHEN the user enables the grayscale toggle
- THEN the preview displays a luminance-correct grayscale version

#### Scenario: Grayscale disabled

- GIVEN grayscale is ON
- WHEN the user disables the toggle
- THEN the preview restores full-color rendering

### Requirement: Brightness Control

The system SHALL provide a `<RangeSlider>` (min: -100, max: +100, default: 0) that adds a constant offset to each RGB channel, clamped to [0, 255].

#### Scenario: Brightness increase

- GIVEN brightness slider at 0
- WHEN the user sets it to +50
- THEN each pixel's R, G, B values increase by 50 (clamped at 255)

#### Scenario: Brightness decrease

- GIVEN brightness slider at 0
- WHEN the user sets it to -50
- THEN each pixel's R, G, B values decrease by 50 (clamped at 0)

### Requirement: Contrast Control

The system SHALL provide a `<RangeSlider>` (min: -100, max: +100, default: 0) applying `(v - 128) × factor + 128` per channel, clamped to [0, 255].

#### Scenario: Contrast increase

- GIVEN contrast slider at 0
- WHEN the user sets it to +50
- THEN dark pixels become darker and bright pixels become brighter

#### Scenario: Contrast decrease

- GIVEN contrast slider at 0
- WHEN the user sets it to -50
- THEN all pixel values move toward middle gray (128)

### Requirement: Saturation Control

The system SHALL provide a `<RangeSlider>` (min: 0, max: 200, default: 100, unit: %) using `ctx.filter = 'saturate(N%)'` or manual HSL adjustment.

#### Scenario: Saturation boost

- GIVEN saturation at 100%
- WHEN the user sets it to 200%
- THEN colors appear more vivid in the preview

#### Scenario: Desaturation

- GIVEN saturation at 100%
- WHEN the user sets it to 0%
- THEN the preview appears fully desaturated (equivalent to grayscale)

### Requirement: Interactive Square Crop

The system SHALL provide an interactive square crop overlay on the preview canvas. The user SHALL drag to reposition the crop area and use a `<RangeSlider>` to adjust crop size.

#### Scenario: Drag crop region

- GIVEN an image is loaded with the crop overlay visible
- WHEN the user drags the crop rectangle
- THEN the preview updates to show only the cropped region

#### Scenario: Adjust crop size via slider

- GIVEN the crop overlay is visible
- WHEN the user adjusts the crop size slider
- THEN the crop square resizes, constrained within image bounds

### Requirement: Grid Size Control

The system SHALL provide a `<RangeSlider>` (min: 5, max: 200, default: 29) controlling the target N×N grid dimension for extraction.

#### Scenario: Grid size change updates preview

- GIVEN grid size at 29
- WHEN the user changes it to 50
- THEN the `<PixelGridPreview>` updates to show a 50×50 extracted grid

#### Scenario: Minimum grid size

- GIVEN grid size at 5
- WHEN the preview renders
- THEN a 5×5 grid is extracted and displayed

### Requirement: Floyd-Steinberg Dithering

The system SHALL provide a toggle to enable Floyd-Steinberg dithering and a `<RangeSlider>` (min: 0, max: 100, default: 100, unit: %) controlling dithering intensity. Dithering SHALL be applied to the downscaled N×N grid before extraction.

#### Scenario: Dithering enabled

- GIVEN dithering toggle is OFF
- WHEN the user enables it at 100% intensity
- THEN the preview shows dithered output with smoother gradients

#### Scenario: Dithering intensity reduction

- GIVEN dithering at 100%
- WHEN the user reduces intensity to 50%
- THEN the dithering effect is visibly weaker (error diffusion scaled by 0.5)

### Requirement: Reset to Defaults

The system SHALL provide a `<Button variant="secondary">` that resets all filter controls to their default values and re-renders the preview.

| Control | Default |
|---------|---------|
| Grayscale | OFF |
| Brightness | 0 |
| Contrast | 0 |
| Saturation | 100% |
| Dithering | OFF |
| Dithering intensity | 100% |
| Grid size | 29 |
| Crop | Center square |

#### Scenario: Reset restores defaults

- GIVEN brightness at +50, contrast at -30, grayscale ON
- WHEN the user clicks "Reset"
- THEN all controls return to default values
- AND the preview shows the unmodified image with center crop

### Requirement: Palette Input

The system SHALL provide a `<TextArea>` accepting one `#RRGGBB` hex color per line. The palette SHALL be validated in real time: invalid lines are highlighted with `aria-invalid="true"`.

#### Scenario: Valid palette entered

- GIVEN the textarea contains `#000000\n#808080\n#FFFFFF`
- WHEN the user types
- THEN no validation errors are shown

#### Scenario: Invalid hex rejected

- GIVEN the textarea contains `#GGGGGG`
- WHEN the user types
- THEN the line shows a validation error "Invalid hex color"
- AND the Process button is disabled

### Requirement: Process Image

The system SHALL provide a `<Button variant="primary">` labeled "Process Image" that extracts the current N×N RGB grid from the canvas and POSTs it to `/api/match` as JSON.

#### Scenario: Successful processing

- GIVEN a valid image with filters applied and a valid palette
- WHEN the user clicks "Process Image"
- THEN `POST /api/match` is called with `{ grid: [[[R,G,B],...]], palette: [...] }`
- AND on success, `GridContext.resetGrid()` is called with the response
- AND the `<ComparisonSlider>` and `<GridEditor>` render the result

#### Scenario: Processing shows loading state

- GIVEN the user clicks "Process Image"
- WHEN the request is in flight
- THEN the button shows a `<Spinner>` and is disabled
- AND a live region announces "Processing image"

#### Scenario: Processing error

- GIVEN the backend returns HTTP 422
- WHEN the request completes
- THEN a `<Toast variant="error">` displays the error detail
- AND the button re-enables

### Requirement: Pixel Grid Preview

The system SHALL render a small `<canvas>` showing the live N×N extracted grid, updating as parameters change (debounced at 150ms). The preview SHALL display the cell count label "N×N".

#### Scenario: Live grid preview updates

- GIVEN an image is loaded with grid size 29
- WHEN the user adjusts brightness
- THEN after 150ms debounce, the pixel grid preview re-renders with updated pixels

#### Scenario: Grid size change reflected

- GIVEN grid size changes from 29 to 50
- WHEN the preview updates
- THEN the label reads "50×50" and the canvas shows 2500 cells

## Non-Functional Requirements

### Requirement: Performance

Live preview filter application SHALL complete within 100ms for images under 4000px on either axis. For larger images, the system SHOULD offload processing to a Web Worker.

#### Scenario: Small image performance

- GIVEN a 2000×1500 image
- WHEN any slider changes
- THEN the preview updates within 100ms

#### Scenario: Large image handling

- GIVEN a 5000×4000 image
- WHEN any slider changes
- THEN the UI remains responsive (no frame drops > 16ms on main thread)

### Requirement: Responsive Layout

The preprocessor SHALL render correctly on viewports from 360px to 1920px. On viewports < 768px, controls SHALL stack vertically using accordion sections with essentials visible and advanced controls collapsed.

#### Scenario: Mobile layout

- GIVEN a 360px viewport
- WHEN the preprocessor renders
- THEN the canvas, controls, and palette input stack vertically with no horizontal overflow

#### Scenario: Desktop layout

- GIVEN a 1280px viewport
- WHEN the preprocessor renders
- THEN the canvas and controls display side-by-side with the editor panel

### Requirement: Accessibility Compliance

All preprocessor controls SHALL satisfy the `accessibility` spec requirements. Every `<RangeSlider>` SHALL expose `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-label`. Filter changes SHALL be announced via a live region.

#### Scenario: Keyboard navigation of all controls

- GIVEN focus is on the first control
- WHEN the user presses Tab repeatedly
- THEN focus traverses all sliders, toggles, textarea, and buttons in logical order

#### Scenario: Slider keyboard adjustment

- GIVEN focus is on the brightness slider
- WHEN the user presses Left/Right arrow keys
- THEN the value changes by the slider step increment

#### Scenario: Filter change announced

- GIVEN the user changes brightness to +30
- WHEN the preview updates
- THEN a live region announces "Brightness: 30"

## Component References

| Component | Path | Role |
|-----------|------|------|
| `RangeSlider` | `src/components/ui/RangeSlider/` | All numeric sliders |
| `Button` | `src/components/ui/Button/` | Process Image, Reset |
| `TextArea` | `src/components/ui/TextArea/` | Palette input |
| `Card` | `src/components/ui/Card/` | Panel containers |
| `Toast` | `src/components/feedback/Toast/` | Error/success feedback |
| `Spinner` | `src/components/feedback/Spinner/` | Processing indicator |
| `EmptyState` | `src/components/feedback/EmptyState/` | Pre-image placeholder |
