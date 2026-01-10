## ADDED Requirements

### Requirement: Dual-Mode Documents Layout
The system MUST provide a documents view with two modes: a grid mode for browsing and a list/table mode for work, and MUST persist the last-used mode per user.

#### Scenario: User switches to list mode
- **WHEN** the user switches from grid to list
- **THEN** the list/table view is shown with the documents collection

#### Scenario: Mode is restored on return
- **WHEN** the user returns to the documents view
- **THEN** the previously selected mode is restored automatically

### Requirement: Priority Signal and Reason
Each document in the listing MUST display a single primary priority signal and a short priority reason derived from existing document fields (e.g., priorityScore, priorityRating, extractCount, dateAdded, dateModified).

#### Scenario: Priority signal is visible
- **WHEN** a document is listed in either mode
- **THEN** the priority signal and reason are visible without opening the inspector

### Requirement: Progressive Disclosure of Metadata
The listing MUST surface only high-signal fields by default, collapse tags to a configurable maximum (default 2-3) with a "+X" overflow indicator, and MUST NOT display internal IDs as primary listing data.

#### Scenario: Tags are collapsed
- **WHEN** a document has more tags than the configured maximum
- **THEN** only the maximum are shown with a "+X" indicator for the remainder

### Requirement: Document Inspector Panel
The documents view MUST provide a persistent right-side inspector panel that opens on selection and includes: full title, source/type, created/added/last-touched timestamps, full tag list, progress counts, primary actions (open/read, extract, reprioritize, archive), and related items when available.

#### Scenario: Selecting a row opens inspector
- **WHEN** a user selects a document in grid or list mode
- **THEN** the inspector opens and displays full metadata and actions

### Requirement: Progress Indicator in Listings
Each document listing MUST show a visual progress indicator and display at least extracts count, cards count, and last activity using available fields (e.g., extractCount, learningItemCount, dateModified/dateLastReviewed).

#### Scenario: Progress shown for a document
- **WHEN** a document appears in the listing
- **THEN** a compact progress visualization and counts are visible

### Requirement: Power-User Search with Token Parsing
The documents view MUST provide a single search box that supports token-like queries (tag:<name>, source:<type>, queue:<state>, extracts<op><n>) and MUST treat unknown tokens as plain text.

#### Scenario: Token query filters results
- **WHEN** the user enters "tag:History extracts=0"
- **THEN** the results are filtered to matching documents

### Requirement: List Mode Sorting
List mode MUST support sorting by priority, last touched, added date, title, extracts count, and cards count, and sorting MUST be stable.

#### Scenario: Sort by priority
- **WHEN** the user sorts by priority
- **THEN** documents appear in priority order with stable ties

### Requirement: Smart Sections in Grid Mode
Grid mode MUST support smart, collapsible sections that group documents by derived state: In Priority Queue, Recently Imported, Active Reading, Parked/Low Priority, and Mostly Extracted.

#### Scenario: Documents appear in computed sections
- **WHEN** grid mode is active
- **THEN** documents are grouped into the computed smart sections

### Requirement: Performance Targets
The documents view MUST keep mode switching perceptually under 200ms and search updates within 150ms after debounce, using virtualization when needed for large libraries.

#### Scenario: Library of 1,000 documents
- **WHEN** the library contains 1,000 documents
- **THEN** mode switching and search updates meet the performance targets

### Requirement: Saved Views
The documents view MUST allow users to save named filter/sort combinations and return to them quickly.

#### Scenario: User saves a view
- **WHEN** the user saves a named view
- **THEN** it appears in a list of saved views for quick access

### Requirement: Keyboard Shortcuts
The documents view MUST support keyboard shortcuts for search focus (Ctrl/Cmd+K), selection navigation (J/K), open selected (Enter), and inspector toggle (I).

#### Scenario: Keyboard navigation
- **WHEN** the user presses J or K in list mode
- **THEN** the selection moves accordingly

### Requirement: Multi-Select and Bulk Actions
The documents view MUST support multi-select with bulk actions such as archive, tag, and reprioritize.

#### Scenario: Bulk archive
- **WHEN** the user selects multiple documents and chooses archive
- **THEN** all selected documents are archived

### Requirement: Next Action Column
The list view MUST support an optional "Next Action" column that infers read/extract/review based on document state.

#### Scenario: Optional next action display
- **WHEN** the list view includes the Next Action column
- **THEN** each row shows a derived next action
