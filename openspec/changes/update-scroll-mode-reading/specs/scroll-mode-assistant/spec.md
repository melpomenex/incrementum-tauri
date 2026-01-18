## ADDED Requirements
### Requirement: Assistant Availability in Scroll Mode
The system SHALL provide the assistant panel during Scroll Mode for document, extract, and RSS items, including web documents.

#### Scenario: Assistant appears for a Scroll Mode document
- **Given** the user enters Scroll Mode on a document item
- **When** the Scroll Mode content is displayed
- **Then** the assistant panel is available alongside the content

#### Scenario: Assistant persists across item types
- **Given** the user navigates from a document item to an extract or RSS item in Scroll Mode
- **When** the Scroll Mode item changes
- **Then** the assistant panel remains available for the current item

### Requirement: Assistant Context Updates in Scroll Mode
The system SHALL update assistant context to reflect the currently active Scroll Mode item.

#### Scenario: Context updates on item change
- **Given** the assistant panel is open in Scroll Mode
- **When** the user navigates to a different Scroll Mode item
- **Then** the assistant context reflects the new item's title and available content
