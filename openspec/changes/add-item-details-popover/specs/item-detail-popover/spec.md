## ADDED Requirements
### Requirement: Item details popover
The system SHALL provide a lightweight item details popover for queue items (documents, extracts, learning items, RSS) in queue and scroll mode views.

#### Scenario: User opens details from queue list
- **WHEN** the user activates the details control on a queue item in a queue view
- **THEN** a popover appears anchored to the control
- **AND** the popover shows basic metadata (title, type, tags/category when available)
- **AND** the popover can be dismissed with click-out or Escape

### Requirement: Scheduling and FSRS transparency
The system SHALL display scheduling/FSRS details in the popover, including preview intervals, stability, difficulty, retrievability, next interval/due date, reps/lapses, and raw values when available.

#### Scenario: Scheduled learning item shows full scheduling details
- **GIVEN** a learning item with scheduling data
- **WHEN** the user opens the details popover
- **THEN** the popover shows stability, difficulty, retrievability, next interval/due date, reps/lapses, and preview intervals

#### Scenario: Non-scheduled item shows placeholders
- **GIVEN** an item without scheduling data
- **WHEN** the user opens the details popover
- **THEN** scheduling fields show "Not scheduled" or "n/a"
- **AND** preview intervals are shown as unavailable

### Requirement: Scroll mode details access
The system SHALL expose a details trigger above each scroll mode item to open the item details popover without leaving scroll mode.

#### Scenario: User opens details in scroll mode
- **WHEN** the user clicks the details control above a scroll mode item
- **THEN** the popover opens with the same content as queue views
- **AND** closing the popover returns focus to scroll mode without navigation
