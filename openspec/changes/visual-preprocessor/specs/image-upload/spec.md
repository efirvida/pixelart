# Delta for image-upload

## ADDED Requirements

### Requirement: Match Endpoint

The system SHALL expose a `POST /api/match` endpoint that accepts a preprocessed N×N RGB pixel grid and a palette, performs CIELAB ΔE2000 matching, and returns palette indices.

#### Scenario: Successful match

- GIVEN a valid N×N RGB grid and a palette of `#RRGGBB` hex strings
- WHEN POSTed to `/api/match` as JSON
- THEN the system returns HTTP 200 with `{ grid: [[int]], palette: [str], dimensions: {width, height} }`

#### Scenario: Request schema

- GIVEN a client constructs the request
- WHEN sending to `/api/match`
- THEN the body SHALL be `{ "grid": [[[R,G,B], ...]], "palette": ["#RRGGBB", ...] }` with `Content-Type: application/json`

#### Scenario: Response shape matches upload response

- GIVEN a successful match
- WHEN the response is received
- THEN the JSON body contains `grid` (2D int array of palette indices), `palette` (list of hex strings), and `dimensions` (`{width, height}`) — identical shape to `/api/upload` response

#### Scenario: Grid dimension validation

- GIVEN a grid where rows have inconsistent column counts
- WHEN POSTed to `/api/match`
- THEN the system returns HTTP 422 with "Grid rows must have equal length"

#### Scenario: Grid dimension range validation

- GIVEN a grid with N < 5 or N > 200
- WHEN POSTed to `/api/match`
- THEN the system returns HTTP 422 with "Grid size must be between 5 and 200"

#### Scenario: RGB value validation

- GIVEN a grid pixel with a channel value outside [0, 255]
- WHEN POSTed to `/api/match`
- THEN the system returns HTTP 422 with "RGB values must be in range [0, 255]"

#### Scenario: Palette format validation

- GIVEN a palette containing a non-hex string (e.g. `"red"`)
- WHEN POSTed to `/api/match`
- THEN the system returns HTTP 422 with "Invalid palette format: expected #RRGGBB"

#### Scenario: Palette size limit

- GIVEN a palette with more than 10 colors
- WHEN POSTed to `/api/match`
- THEN the system returns HTTP 422 with "Palette must contain at most 10 colors"

#### Scenario: Grid too large

- GIVEN a grid exceeding 200×200 (40,000 cells)
- WHEN POSTed to `/api/match`
- THEN the system returns HTTP 413 with "Grid too large"

#### Scenario: Matching performance

- GIVEN a 29×29 grid with a 5-color palette
- WHEN POSTed to `/api/match`
- THEN the response arrives in under 2 seconds

### Requirement: Backward Compatibility

The existing `POST /api/upload` endpoint SHALL continue to function unchanged. `POST /api/match` is additive — it does not replace or modify the upload flow.

#### Scenario: Upload endpoint unchanged

- GIVEN an existing client using `POST /api/upload`
- WHEN it sends a multipart image with palette and grid_size
- THEN the response is identical to pre-change behavior

#### Scenario: Both endpoints coexist

- GIVEN both `/api/upload` and `/api/match` are registered
- WHEN either endpoint is called with valid input
- THEN both return the same response shape (`grid`, `palette`, `dimensions`)

### Requirement: Frontend Match Client

The system SHALL provide a `matchGrid()` function in `frontend/src/api/client.ts` that POSTs the preprocessed RGB grid to `/api/match`.

#### Scenario: matchGrid sends correct payload

- GIVEN an N×N RGB grid and a palette array
- WHEN `matchGrid(grid, palette)` is called
- THEN a POST request is sent to `/api/match` with `{ grid, palette }` as JSON
- AND the response is parsed as `UploadResponse`

#### Scenario: matchGrid error handling

- GIVEN the backend returns HTTP 422
- WHEN `matchGrid()` receives the response
- THEN an `ApiError` is thrown with the server's error detail message
