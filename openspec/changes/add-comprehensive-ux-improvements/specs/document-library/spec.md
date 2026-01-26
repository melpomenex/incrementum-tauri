# document-library Specification Deltas

## ADDED Requirements

### Requirement: Collections Management
The system SHALL provide hierarchical collections (folders) for organizing documents, stored in the database with support for both manual and smart collections.

#### Scenario: Creating a manual collection
- **WHEN** a user creates a new collection named "Research Papers"
- **THEN** a collection record is created in the database
- **AND** the collection appears in the sidebar navigation
- **AND** the user can manually assign documents to this collection

#### Scenario: Creating a smart collection
- **WHEN** a user creates a smart collection with filter "tag:ml AND date_added:7days"
- **THEN** the collection automatically includes matching documents
- **AND** the collection updates in real-time as documents change
- **AND** filters support tag, category, date, and progress criteria

#### Scenario: Hierarchical collections
- **WHEN** a user creates a sub-collection within an existing collection
- **THEN** the parent-child relationship is stored in the database
- **AND** the sidebar displays the collection hierarchy with indentation
- **AND** documents can be assigned to any level in the hierarchy

#### Scenario: Renaming a collection
- **WHEN** a user renames a collection
- **THEN** the collection name is updated in the database
- **AND** the change is reflected throughout the UI

#### Scenario: Deleting a collection
- **WHEN** a user deletes a collection
- **THEN** the collection is removed from the database
- **AND** documents are not deleted (only the collection-document associations)
- **AND** if the collection had sub-collections, those are also deleted

### Requirement: Document Assignment to Collections
The system SHALL allow documents to be assigned to multiple collections.

#### Scenario: Assigning to one collection
- **WHEN** a user drags a document to a collection in the sidebar
- **THEN** the document is associated with that collection
- **AND** the document appears when viewing that collection

#### Scenario: Assigning to multiple collections
- **WHEN** a user adds a document to multiple collections
- **THEN** the document appears in each collection
- **AND** deleting from one collection does not remove from others

#### Scenario: Bulk assignment
- **WHEN** a user selects multiple documents and chooses "Add to Collection"
- **THEN** all selected documents are assigned to the chosen collection
- **AND** a confirmation shows how many documents were assigned

### Requirement: Collection-Specific Views
The system SHALL provide filtered views when browsing a specific collection.

#### Scenario: Viewing a collection
- **WHEN** a user clicks a collection in the sidebar
- **THEN** the main view displays only documents in that collection
- **AND** the view title shows the collection name
- **AND** breadcrumbs show the collection hierarchy path

#### Scenario: Collection statistics
- **WHEN** a user views a collection
- **THEN** the collection header shows document count, total reading time
- **AND** average progress across documents is displayed

### Requirement: Navigation Redesign
The system SHALL provide redesigned navigation with "Continue Reading" as a priority item and collections organized in a dedicated section.

#### Scenario: Navigation structure
- **WHEN** the sidebar is displayed
- **THEN** "Continue Reading" appears at the top with a distinct icon
- **AND** core navigation follows (Library, Queue, Review, Analytics)
- **AND** Collections section appears after core navigation
- **AND** Reading Lists section appears below Collections

#### Scenario: Collapsible sections
- **WHEN** a user clicks a section header in the sidebar
- **THEN** the section expands or collapses
- **AND** the collapsed state is persisted in user settings

### Requirement: Mobile-Responsive Navigation
The system SHALL provide a mobile-responsive navigation with collapsible sidebar and bottom navigation bar.

#### Scenario: Collapsible sidebar on desktop
- **WHEN** a user clicks the collapse button
- **THEN** the sidebar collapses to icons only
- **AND** content expands to use the full width
- **AND** hovering over icons shows tooltips

#### Scenario: Bottom navigation on mobile
- **WHEN** the app is viewed on a mobile device
- **THEN** the sidebar is hidden by default
- **AND** a bottom navigation bar shows core items (Continue Reading, Library, Queue, Review)
- **AND** a hamburger menu provides access to full navigation

### Requirement: Theme Contrast Improvements
The system SHALL meet WCAG AA contrast requirements for all UI elements.

#### Scenario: Dark theme contrast
- **WHEN** the dark theme is active
- **THEN** all text has at least 4.5:1 contrast ratio against backgrounds
- **AND** interactive elements have at least 3:1 contrast ratio
- **AND** focus indicators are clearly visible

#### Scenario: Light theme variant
- **WHEN** a user selects the light theme
- **THEN** a true light theme is applied (not just inverted colors)
- **AND** contrast ratios meet WCAG AA requirements
- **AND** the theme persists across sessions

#### Scenario: Theme customization
- **WHEN** a user customizes the theme
- **THEN** accent colors can be selected from a palette
- **AND** the preview updates in real-time
- **AND** customizations are saved to user settings

### Requirement: Command Palette
The system SHALL provide a global command palette accessible via keyboard shortcut.

#### Scenario: Opening command palette
- **WHEN** a user presses Ctrl/Cmd + K
- **THEN** the command palette modal appears
- **AND** focus is in the search input
- **AND** recent commands are displayed

#### Scenario: Searching commands
- **WHEN** a user types in the command palette search
- **THEN** commands are filtered by label and keywords
- **AND** fuzzy matching allows approximate searches
- **AND** keyboard navigation allows selection

#### Scenario: Executing a command
- **WHEN** a user selects a command and presses Enter
- **THEN** the command action is executed
- **AND** the command palette closes
- **AND** the executed command moves to "recent" list

#### Scenario: Command categories
- **WHEN** commands are displayed
- **THEN** they are grouped by category (Navigation, Documents, Review, Settings)
- **AND** category headers help with discoverability

### Requirement: Keyboard Shortcuts System
The system SHALL provide a comprehensive keyboard shortcut system with a help dialog.

#### Scenario: Keyboard shortcuts in viewer
- **WHEN** a user is viewing a document
- **THEN** Space scrolls down, Shift+Space scrolls up
- **AND** J/K navigate to next/previous page (for paged content)
- **AND** B creates a bookmark at current position
- **AND** H toggles highlight mode
- **AND** Esc closes the viewer

#### Scenario: Keyboard shortcuts help
- **WHEN** a user presses Ctrl/Cmd + /
- **THEN** a help modal displays all keyboard shortcuts
- **AND** shortcuts are grouped by context (Global, Viewer, Review)
- **AND** the modal can be dismissed with Esc

#### Scenario: Customizable shortcuts
- **WHEN** a user opens keyboard shortcut settings
- **THEN** all shortcuts are displayed with current key bindings
- **AND** the user can click to reassign any shortcut
- **AND** conflicts are detected and highlighted

### Requirement: Document Grid with Progress Indicators
The system SHALL display progress indicators on document thumbnails in grid and list views.

#### Scenario: Progress bar on thumbnail
- **WHEN** a document is displayed in grid view
- **THEN** a horizontal progress bar appears at the bottom of the thumbnail
- **AND** the bar shows completion percentage (0-100%)
- **AND** the bar color indicates status (gray=not started, blue=in progress, green=complete)

#### Scenario: Time remaining badge
- **WHEN** a document has reading progress
- **THEN** a badge shows estimated time remaining
- **AND** the format is "X min left" or "X pages left"

#### Scenario: Recently viewed indicator
- **WHEN** a document was viewed in the last 24 hours
- **THEN** a "Recently viewed" badge appears on the thumbnail
