# Image Upload Specification

## Purpose

Provides a FastAPI endpoint for uploading pre-cropped images and a React widget for the client-side upload experience. Bridges the browser to the image pipeline.

## Requirements

### Requirement: Upload Endpoint

The system SHALL expose a `POST /api/upload` endpoint that accepts a multipart image file and returns the processed grid data.

#### Scenario: Successful upload

- GIVEN a valid 580×580 JPEG file
- WHEN POSTed to `/api/upload`
- THEN the system returns HTTP 200 with JSON containing the matched grid (2D array of palette indices) and palette metadata

#### Scenario: Response includes grid and palette

- GIVEN a successful upload
- WHEN the response is received
- THEN the JSON body contains `grid` (2D int array), `palette` (list of hex strings), and `dimensions` (width, height)

#### Scenario: Processing under 2 seconds

- GIVEN a 580×580 JPEG
- WHEN uploaded with default 29×29 grid and 5-color palette
- THEN the response arrives in under 2 seconds

### Requirement: File Validation

The system SHALL reject uploads that are not valid raster images or exceed the maximum file size.

#### Scenario: Oversized file

- GIVEN a 20MB image file
- WHEN uploaded
- THEN the system returns HTTP 413 with an error message

#### Scenario: Non-image file

- GIVEN a `.pdf` or `.txt` file
- WHEN uploaded
- THEN the system returns HTTP 415 (Unsupported Media Type)

#### Scenario: Corrupt image

- GIVEN a file with `.jpg` extension but invalid content
- WHEN uploaded
- THEN the system returns HTTP 422 with a descriptive error

### Requirement: Max Size Configuration

The system SHALL enforce a configurable maximum upload size (default 10MB).

#### Scenario: Within limit

- GIVEN max_size is 10MB and file is 5MB
- WHEN uploaded
- THEN the system processes the file normally

#### Scenario: Exceeds limit

- GIVEN max_size is 10MB and file is 15MB
- WHEN uploaded
- THEN the system returns HTTP 413

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
