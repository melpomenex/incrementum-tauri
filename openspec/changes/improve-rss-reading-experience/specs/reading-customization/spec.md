## ADDED Requirements

### Requirement: User customization of reading typography
The user MUST be able to customize the visual appearance of the RSS article text to suit their reading preferences.
#### Scenario: User customizes font settings
- **Given** the user is viewing the RSS Reader
- **When** they open the Customization Panel and select the "Reader" tab
- **Then** they should see options to change Font Family, Font Size, Line Height, and Content Width
- **And** changes should be reflected immediately in the article view (if visible) or upon closing
- **And** these settings should persist across sessions

### Requirement: Improved desktop reading defaults
The default styling for RSS articles on desktop SHALL be optimized for long-form reading.
#### Scenario: Desktop user benefits from readable styles
- **Given** the user is on a desktop device
- **When** they view an article
- **Then** the text should be constrained to a readable max-width (e.g., 65ch) by default, instead of spanning the full screen width
- **And** the font size should be comfortable for reading (e.g., larger than the UI font)

## MODIFIED Requirements

### Requirement: Unified reading styles across devices
The styling system SHALL be unified so that preferences apply to both mobile and desktop views where appropriate.
#### Scenario: Consistent styling
- **Given** the existing `mobile.css` styles
- **When** the new reading styles are implemented
- **Then** the mobile view should inherit these configurable styles instead of hardcoded values where appropriate
