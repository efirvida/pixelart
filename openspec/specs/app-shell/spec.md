# App Shell Specification

## Purpose

Defines the application's outer structure: responsive layout components, HTML document metadata, font loading strategy, and the top-level error boundary. Provides the structural frame that all features render within.

## Requirements

### Requirement: Responsive Page Layout

The system SHALL provide `PageLayout`, `Section`, `Toolbar`, `Header`, and `Footer` components in `src/components/layout/` that compose into a responsive shell.

Layout behavior:
- **Mobile** (<768px): sections stack vertically, toolbar collapses to icon-only
- **Desktop** (≥768px): primary sections side-by-side, toolbar horizontal
- All layout components MUST use CSS Modules consuming design tokens

#### Scenario: Mobile stacking

- GIVEN viewport width is 480px
- WHEN `PageLayout` renders upload and editor sections
- THEN sections stack vertically with no horizontal overflow

#### Scenario: Desktop side-by-side

- GIVEN viewport width is 1280px
- WHEN `PageLayout` renders upload and editor sections
- THEN sections display side-by-side using CSS Grid or Flexbox

#### Scenario: Toolbar collapse

- GIVEN viewport width drops below 768px
- WHEN the `Toolbar` component is rendered
- THEN action labels hide and only icons remain visible with tooltips

### Requirement: HTML Head Metadata

The system SHALL configure `index.html` with proper meta tags, title, favicon reference, and font preconnect hints.

Required head elements:
- `<title>` with descriptive app name
- `<meta name="description">` with app summary
- `<meta name="viewport">` for responsive behavior
- `<link rel="icon">` pointing to favicon asset
- `<link rel="preconnect">` for font CDN (if external fonts used)

#### Scenario: SEO and social metadata

- GIVEN a browser or crawler loads `index.html`
- WHEN the `<head>` is parsed
- THEN title, description, and viewport meta tags are present

#### Scenario: Favicon loads

- GIVEN the app is served
- WHEN the browser requests the favicon
- THEN the icon displays in the browser tab without 404 errors

### Requirement: App-Level Error Boundary

The system SHALL wrap the root application in an `ErrorBoundary` component that catches unhandled render errors and displays a recoverable fallback UI.

#### Scenario: Unhandled render error caught

- GIVEN a child component throws during render
- WHEN React propagates the error
- THEN the ErrorBoundary catches it and displays a fallback with an error message and a "Reload" button

#### Scenario: Fallback allows recovery

- GIVEN the ErrorBoundary is showing its fallback UI
- WHEN the user clicks "Reload"
- THEN the app attempts to re-render the component tree (resets error state)

#### Scenario: Error details logged

- GIVEN an error is caught by the boundary
- WHEN the fallback renders
- THEN `console.error` is called with the error and component stack

### Requirement: Font Loading

The system SHALL load typography using a `font-display: swap` strategy to prevent invisible text during load.

#### Scenario: System font stack fallback

- GIVEN no external fonts are configured
- WHEN text renders
- THEN the system font stack from `tokens.css` (`--font-family-base`) is used immediately

#### Scenario: External font with swap

- GIVEN an external font is declared via `<link>` in `index.html`
- WHEN the font file is still loading
- THEN text renders with the fallback font immediately and swaps when the custom font loads
