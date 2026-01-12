## ADDED Requirements
### Requirement: Scroll Mode Document Rendering
The system SHALL load PDF and EPUB content in scroll mode using the same file loading pipeline as the standard document viewer.

#### Scenario: Scroll mode renders a PDF
- **Given** a PDF document is in the reading queue
- **When** the user opens scroll mode and navigates to that document
- **Then** the PDF content should render with scrollable pages
- **And** the viewer should not show a missing file data error state

#### Scenario: Scroll mode renders an EPUB
- **Given** an EPUB document is in the reading queue
- **When** the user opens scroll mode and navigates to that document
- **Then** the EPUB content should render with scrollable chapters
- **And** the viewer should not show a missing file data error state

### Requirement: Scroll Mode Queue Progression
The system SHALL advance to the next queue item when the user completes the current item in scroll mode.

#### Scenario: Rating advances to next item
- **Given** the user is viewing a document in scroll mode
- **When** the user submits a rating
- **Then** the scroll mode view should advance to the next queue item

#### Scenario: Marking RSS advances to next item
- **Given** the user is viewing an RSS item in scroll mode
- **When** the user marks the item as read
- **Then** the scroll mode view should advance to the next queue item
