# Delta for Image Upload

## ADDED Requirements

### Requirement: Design System Integration

The UploadWidget and ImageCropper SHALL be rebuilt using design-system primitives — no raw inline styles.

#### Scenario: UploadWidget uses primitives

- GIVEN the UploadWidget renders
- WHEN inspected
- THEN it uses `<Card>` for the drop zone, `<Button>` for actions, `<Spinner>` for loading, and CSS Modules for layout

#### Scenario: ImageCropper uses primitives

- GIVEN the ImageCropper renders
- WHEN inspected
- THEN it uses `<RangeSlider>` for crop controls and design tokens for all spacing/colors

### Requirement: Upload Feedback States

The UploadWidget SHALL display distinct loading, empty, and error states using design-system feedback primitives.

#### Scenario: Empty state

- GIVEN no image has been uploaded yet
- WHEN the UploadWidget renders
- THEN an `<EmptyState>` component shows an upload icon and instructional text

#### Scenario: Loading state with skeleton

- GIVEN an upload is in progress
- WHEN the loading state is active
- THEN a `<Skeleton>` placeholder renders in the preview area and `aria-busy="true"` is set

#### Scenario: Error state with toast

- GIVEN an upload fails (validation or network error)
- WHEN the error response arrives
- THEN a `<Toast variant="error">` displays the error message and the drop zone re-enables

### Requirement: Upload Accessibility

The upload flow SHALL satisfy all accessibility spec requirements (focus, ARIA, keyboard, live regions).

#### Scenario: Drop zone keyboard activation

- GIVEN focus is on the drop zone
- WHEN the user presses Enter or Space
- THEN the file picker dialog opens

#### Scenario: Upload progress announced

- GIVEN an upload is in progress
- WHEN it completes or fails
- THEN a live region announces the result

## MODIFIED Requirements

### Requirement: React Upload Widget

The system SHALL provide a React component built with design-system primitives (Card, Button, Spinner, EmptyState, Toast) that supports drag-and-drop and file picker, posts to the upload endpoint, and displays loading/empty/error feedback states.
(Previously: Basic React component with drag-and-drop and file picker, inline styles, no structured feedback states)

#### Scenario: Drag and drop upload

- GIVEN the upload widget is rendered with design-system primitives
- WHEN the user drags a JPEG onto the drop zone
- THEN the file is uploaded, the grid preview loads, and a success toast appears

#### Scenario: File picker upload

- GIVEN the upload widget is rendered
- WHEN the user clicks the file input button and selects a PNG
- THEN the file is uploaded and the grid preview loads

#### Scenario: Upload progress feedback

- GIVEN a file is being uploaded
- WHEN the upload is in progress
- THEN a `<Skeleton>` placeholder renders in the preview area, `aria-busy="true"` is set, and a live region announces "Uploading"

#### Scenario: Upload error display

- GIVEN an upload fails validation
- WHEN the error response arrives
- THEN a `<Toast variant="error">` displays the error message, the drop zone re-enables, and the live region announces the error

#### Scenario: Empty state before upload

- GIVEN no image has been uploaded
- WHEN the widget renders
- THEN an `<EmptyState>` shows an upload icon and instructional text
