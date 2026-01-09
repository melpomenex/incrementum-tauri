# Theme System Specification

## ADDED Requirements

### Requirement: Theme Provider Infrastructure
The application MUST provide a comprehensive theming system that supports multiple themes with live preview capabilities.

#### Scenario: Initialize theme system on application startup
**Given** the application is launched
**When** the theme provider initializes
**Then** it should load the user's last selected theme from persistent storage
**And** apply CSS variables to the document root
**And** make the theme available through React context

#### Scenario: Switch between themes
**Given** the user is viewing any page in the application
**When** the user selects a different theme from the theme picker
**Then** the application should immediately update CSS variables
**And** all components should reflect the new theme
**And** the selection should be persisted to storage

#### Scenario: Create custom theme
**Given** the user opens the theme customization dialog
**When** the user modifies color values and saves
**Then** the new theme should be added to the theme list
**And** the theme should be persisted with a unique identifier
**And** the user can select and apply the custom theme

### Requirement: Theme Migration from QSS
The system MUST support migrating all 17 themes from the Qt-based Incrementum-CPP application.

#### Scenario: Parse QSS theme file
**Given** a QSS theme file from Incrementum-CPP
**When** the migration tool processes the file
**Then** it should extract all color values and style definitions
**And** convert them to CSS custom properties
**And** generate a valid theme JSON object

#### Scenario: Validate migrated theme
**Given** a theme has been migrated from QSS
**When** the theme validation runs
**Then** it should check for all required color properties
**And** verify CSS syntax is valid
**And** provide warnings for any unsupported QSS features

### Requirement: Theme Picker UI
The application MUST provide a user-friendly interface for browsing and selecting themes.

#### Scenario: Browse available themes
**Given** the user opens the theme picker
**When** the dialog displays
**Then** it should show all 17 built-in themes in a grid layout
**And** each theme should display a color swatch preview
**And** the currently selected theme should be visually indicated

#### Scenario: Preview theme before applying
**Given** the user is browsing themes in the picker
**When** the user hovers over a theme option
**Then** the application should temporarily apply that theme
**And** show a "preview" indicator
**And** revert when focus is lost

#### Scenario: Customize accent colors
**Given** the user has selected a theme
**When** they open the theme customization panel
**Then** they should be able to modify accent colors using a color picker
**And** see real-time preview of changes
**And** save the customized variant

### Requirement: Theme Persistence
Themes and user preferences MUST be reliably stored and restored.

#### Scenario: Save theme preference
**Given** the user selects or customizes a theme
**When** the change is applied
**Then** the theme configuration should be saved to Tauri's persistent store
**And** include theme ID and any custom overrides
**And** be available on next application launch

#### Scenario: Export custom theme
**Given** the user has created a custom theme
**When** they choose to export the theme
**Then** the system should generate a JSON file with the theme definition
**And** include metadata (name, author, version)
**And** save to the user's selected location

#### Scenario: Import theme
**Given** the user has a theme JSON file
**When** they import the theme through the settings
**Then** the theme should be validated and added to available themes
**And** appear in the theme picker
**And** be selectable like built-in themes

### Requirement: Dark Mode Detection
The application MUST detect and respect system-level dark mode preferences.

#### Scenario: Auto-detect system theme
**Given** the user has not manually selected a theme
**When** the application starts
**Then** it should detect the operating system's theme preference
**And** automatically select a matching dark or light theme
**And** allow manual override at any time

#### Scenario: Respond to system theme changes
**Given** the application is running with auto-detect enabled
**When** the operating system's theme changes
**Then** the application should switch to the appropriate theme
**And** notify the user of the change
**And** persist the new selection

### Requirement: Theme Variants
Built-in themes MUST support both light and dark variants where applicable.

#### Scenario: Light theme variant
**Given** a theme that has both light and dark variants
**When** the user selects the theme
**Then** both variants should be available as sub-options
**And** the user can switch between light and dark independently
**And** the preference should be remembered per theme

### Requirement: Component-Level Theming
The theme system MUST support component-specific styling overrides.

#### Scenario: Define component-specific colors
**Given** a theme definition
**When** the theme includes component-specific colors (e.g., toolbar, sidebar)
**Then** those colors should override base theme colors for those components
**And** maintain consistency with the overall theme
**And** allow fine-grained customization

## MODIFIED Requirements

### Requirement: Application styling
The application MUST provide a comprehensive theming system with 17+ themes, customization, and live preview.

#### Scenario: Switch themes with live preview
**Given** the user opens the theme picker
**When** they select a theme from the list
**Then** the application styling should update immediately
**And** the selection should persist across sessions

## Implementation Notes

### CSS Variable Naming Convention
```css
--color-background
--color-surface
--color-primary
--color-on-primary
--color-outline
--spacing-sm
--spacing-md
--spacing-lg
--radius-sm
--radius-md
--radius-lg
```

### Theme JSON Schema
```json
{
  "$schema": "./theme-schema.json",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "variant": { "enum": ["light", "dark"] },
    "colors": {
      "type": "object",
      "properties": {
        "background": { "type": "string" },
        "surface": { "type": "string" },
        "primary": { "type": "string" }
      }
    }
  }
}
```

### Performance Considerations
- Theme switching should use CSS variable updates only (no re-renders)
- Theme preview should use temporary variable overrides
- Large theme lists should use virtual scrolling
