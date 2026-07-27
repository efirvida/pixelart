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

The system SHALL provide a React component with drag-and-drop and file picker that posts to the upload endpoint.

#### Scenario: Drag and drop upload

- GIVEN the upload widget is rendered
- WHEN the user drags a JPEG onto the drop zone
- THEN the file is uploaded and the grid preview loads

#### Scenario: File picker upload

- GIVEN the upload widget is rendered
- WHEN the user clicks the file input and selects a PNG
- THEN the file is uploaded and the grid preview loads

#### Scenario: Upload progress feedback

- GIVEN a file is being uploaded
- WHEN the upload is in progress
- THEN the widget displays a loading indicator

#### Scenario: Upload error display

- GIVEN an upload fails validation
- WHEN the error response arrives
- THEN the widget displays the error message to the user
