# Design System Specification

## Purpose

Establishes design tokens as CSS custom properties, CSS Modules conventions, and a reusable UI primitive library. All visual styling across the application MUST consume this system — no raw inline styles outside primitives.

## Requirements

### Requirement: Design Tokens

The system SHALL define all visual tokens as CSS custom properties in a single `tokens.css` file, organized by category.

Token categories:
- **Colors**: primary, accent, surface, text, error, success (each with base + hover/active variants)
- **Spacing**: 4px base scale (`--space-1` = 4px through `--space-8` = 32px)
- **Typography**: system font stack, heading sizes (h1–h4), body sizes (sm/md/lg), line-heights, font-weights
- **Shadows**: elevation-1 (cards), elevation-2 (modals/dropdowns)
- **Border Radius**: sm (4px), md (8px), lg (16px), full (9999px)

#### Scenario: Tokens consumed by any component

- GIVEN a component CSS Module
- WHEN it styles an element
- THEN it references `var(--color-primary)` or similar — never a hard-coded hex/rgb value

#### Scenario: Token modification propagates globally

- GIVEN `--color-primary` is changed in `tokens.css`
- WHEN the app rebuilds
- THEN every component using `--color-primary` reflects the new value

### Requirement: CSS Modules Conventions

The system SHALL use CSS Modules for all component styling with consistent file naming and class composition.

#### Scenario: File co-location

- GIVEN a component `Button.tsx`
- WHEN styling is needed
- THEN a `Button.module.css` file exists in the same directory

#### Scenario: Class composition over nesting

- GIVEN a component needs variant styling (e.g. primary vs secondary button)
- WHEN classes are applied
- THEN CSS Modules compose syntax (`composes: base from './shared.module.css'`) is used rather than deep selector nesting

### Requirement: UI Primitives Library

The system SHALL provide reusable, typed React primitives in `src/components/ui/`. Each primitive MUST accept a `className` prop for composition and forward refs.

Primitives: Button, IconButton, Card, TextInput, TextArea, RangeSlider, Select, Modal, Toast, Spinner, Skeleton, EmptyState.

#### Scenario: Primitive renders with design tokens

- GIVEN a `<Button variant="primary">` is rendered
- WHEN inspected
- THEN its background uses `var(--color-primary)`, padding uses `var(--space-2)`, radius uses `var(--radius-md)`

#### Scenario: Primitive accepts external className

- GIVEN a consumer needs custom layout on a `<Card>`
- WHEN `className={styles.customCard}` is passed
- THEN both the primitive's internal classes and the external class are applied

#### Scenario: Primitive forwards ref

- GIVEN a consumer needs a DOM reference on `<TextInput>`
- WHEN a `ref` prop is provided
- THEN the underlying `<input>` element receives the ref

### Requirement: Primitive Interaction States

Every interactive primitive SHALL define visual states for hover, active, focus-visible, and disabled.

#### Scenario: Hover state

- GIVEN a `<Button>` is rendered and enabled
- WHEN the user hovers over it
- THEN the background shifts to `var(--color-primary-hover)` with a CSS transition

#### Scenario: Disabled state

- GIVEN a `<Button disabled>`
- WHEN rendered
- THEN it shows reduced opacity, `cursor: not-allowed`, and does not respond to clicks

#### Scenario: Focus-visible indicator

- GIVEN a `<Button>` receives keyboard focus
- WHEN `:focus-visible` matches
- THEN a 2px outline using `var(--color-accent)` with 2px offset is displayed
