# Image Pipeline Specification

## Purpose

Defines the pure-function pipeline that ingests a raster image, resizes it to a configurable N×N grid, and maps each cell to a discrete color. The module MUST NOT import FastAPI or any transport layer — it is independently testable.

## Requirements

### Requirement: Image Ingestion

The system SHALL accept a raster image (JPEG, PNG, WebP) as raw bytes or file path and decode it into an in-memory array.

#### Scenario: Valid image ingested

- GIVEN a valid JPEG byte stream
- WHEN the ingestion function is called
- THEN the system returns an RGB pixel array and image metadata (width, height, format)

#### Scenario: Unsupported format

- GIVEN a BMP or TIFF file
- WHEN the ingestion function is called
- THEN the system rejects the input with a descriptive error

#### Scenario: Corrupt file

- GIVEN a truncated or corrupt image file
- WHEN the ingestion function is called
- THEN the system raises an error without crashing the process

### Requirement: Resize to Grid

The system SHALL resize the ingested image to an N×N pixel grid using a configurable dimension (default 29×29) and bicubic downsampling.

#### Scenario: Default grid resize

- GIVEN a 580×580 source image
- WHEN resize is called with grid_size=29
- THEN the output is a 29×29 pixel array

#### Scenario: Custom grid size

- GIVEN any valid source image
- WHEN resize is called with grid_size=50
- THEN the output is a 50×50 pixel array

#### Scenario: Invalid grid size

- GIVEN grid_size is 0 or negative
- WHEN resize is called
- THEN the system rejects with a validation error

#### Scenario: Non-square image

- GIVEN a 800×400 source image and grid_size=29
- WHEN resize is called
- THEN the output is a 29×14 pixel array preserving the original aspect ratio (width and height scaled independently to fit within grid_size)

### Requirement: Pixel Extraction

The system SHALL expose the resized grid as a flat or 2D array of RGB tuples, one per cell, suitable for downstream palette matching.

#### Scenario: Extract pixels from resized grid

- GIVEN a 29×29 resized image
- WHEN pixel extraction is called
- THEN the system returns a list of 841 RGB tuples

#### Scenario: Pipeline end-to-end

- GIVEN a valid 580×580 JPEG
- WHEN the full pipeline (ingest → resize → extract) runs
- THEN the output is a 29×29 array of RGB tuples completed in under 2 seconds

### Requirement: Pure Function Contract

The pipeline module SHALL be importable and testable without any FastAPI, HTTP, or filesystem-side-effect dependencies.

#### Scenario: Core tests run isolated

- GIVEN the core module is imported in a test runner
- WHEN unit tests execute
- THEN no FastAPI imports are required and no HTTP calls are made
