# dark-theme-contrast Specification Delta

## ADDED Requirements
### Requirement: Dark theme contrast baseline
For every built-in dark theme, the system SHALL ensure text, icon, and button-label foreground colors meet WCAG 2.1 AA contrast ratios against their backgrounds across all app surfaces.

#### Scenario: User browses the app with a built-in dark theme
- **WHEN** the user selects a built-in dark theme and navigates through the app
- **THEN** text, icons, and button labels SHALL be readable on their background surfaces
- **AND** contrast ratios SHALL meet or exceed 4.5:1 for normal text and 3:1 for large text/icons

#### Scenario: User hovers or focuses interactive controls in a dark theme
- **WHEN** buttons, links, or inputs are hovered, focused, or active in a built-in dark theme
- **THEN** the foreground/background contrast SHALL remain within the same AA thresholds

### Requirement: Dark theme semantic legibility
For every built-in dark theme, semantic colors (success, warning, error) SHALL remain legible and visually distinct on dark surfaces.

#### Scenario: System shows semantic badges or alerts in a dark theme
- **WHEN** success, warning, or error UI elements appear in a built-in dark theme
- **THEN** their text and icons SHALL be readable against their backgrounds
- **AND** the semantic colors SHALL remain visually distinct from each other
