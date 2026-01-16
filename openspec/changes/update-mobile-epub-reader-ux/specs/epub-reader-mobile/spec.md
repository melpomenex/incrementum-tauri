## ADDED Requirements

### Requirement: Mobile EPUB Reading Layout
The system SHALL render EPUB content on mobile as a single-column, scrollable reading surface with readable typography, constrained line length, and safe-area-aware padding, and SHALL avoid horizontal scrolling.

#### Scenario: Open EPUB on a mobile device
- **WHEN** a user opens an EPUB document on a mobile device
- **THEN** the content displays as a single column with readable margins and line height
- **AND** the content does not require horizontal scrolling
- **AND** the padding respects device safe areas

### Requirement: Mobile Reader Chrome and Navigation
The system SHALL provide minimal, tap-toggle reader chrome on mobile with access to navigation, settings, and table of contents, and SHALL allow tap zones for previous/next navigation without disrupting text selection.

#### Scenario: Toggle and use mobile chrome
- **WHEN** the user taps the reading surface
- **THEN** the reader chrome toggles between visible and hidden states
- **AND** the chrome exposes controls for navigation, settings, and table of contents

#### Scenario: Navigate with tap zones
- **WHEN** the user taps the left or right zone while no text selection is active
- **THEN** the reader navigates to the previous or next section

### Requirement: Mobile Reading Progress Indicator
The system SHALL display a compact progress indicator on mobile that reflects current reading position and updates as the user reads.

#### Scenario: Progress updates while reading
- **WHEN** the user scrolls through an EPUB on mobile
- **THEN** the progress indicator updates to reflect the current location

### Requirement: Mobile Table of Contents Access
The system SHALL provide a mobile-friendly table of contents view that opens on demand and navigates to the selected section.

#### Scenario: Open TOC and navigate
- **WHEN** the user opens the table of contents on mobile
- **THEN** the system shows a list of sections optimized for small screens
- **AND** selecting a section navigates to that location and closes the TOC view

### Requirement: Mobile EPUB Preferences
The system SHALL allow mobile readers to adjust EPUB typography preferences (font size, font family, line height) and SHALL persist those preferences across sessions.

#### Scenario: Update typography preferences
- **WHEN** the user changes EPUB typography settings on mobile
- **THEN** the changes apply immediately to the EPUB content
- **AND** the preferences persist for future EPUB sessions
