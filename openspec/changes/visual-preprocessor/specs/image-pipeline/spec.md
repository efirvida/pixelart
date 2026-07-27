# Delta for image-pipeline

## ADDED Requirements

### Requirement: Dual Pipeline Architecture

The image pipeline SHALL support two execution paths: a web flow where steps 1–6 execute in the browser via Canvas API, and an API flow where the full 7-step backend pipeline runs unchanged. The backend `image_pipeline.py` module SHALL remain importable and functionally unchanged as the reference implementation and test oracle.

#### Scenario: Web flow uses frontend preprocessing

- GIVEN a user loads an image in the browser preprocessor
- WHEN they adjust filters and click "Process Image"
- THEN steps 1–6 execute in the browser via Canvas API
- AND only the N×N RGB grid is sent to the backend via `POST /api/match`
- AND the backend executes step 7 (palette matching) and returns indices

#### Scenario: API flow uses backend pipeline

- GIVEN an external API client sends a multipart image to `POST /api/upload`
- WHEN the request is received
- THEN the full 7-step backend pipeline executes in `image_pipeline.py`
- AND the response contains matched grid indices, palette, and dimensions

#### Scenario: Backend pipeline remains testable

- GIVEN the `image_pipeline.py` module
- WHEN unit tests run
- THEN all 7 steps are testable independently without HTTP or frontend dependencies
