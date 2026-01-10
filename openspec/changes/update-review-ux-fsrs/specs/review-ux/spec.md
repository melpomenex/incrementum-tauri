## ADDED Requirements

### Requirement: Session-Aware Queue Blocks
The system MUST present review and reading queues as session-aware blocks with explicit time budgets and safe stop points.

#### Scenario: Session block created
- **WHEN** a user starts a review session
- **THEN** the queue is grouped into labeled blocks with time budgets

#### Scenario: Safe stop point communicated
- **WHEN** a session is in progress
- **THEN** the UI indicates a safe stop item and the expected time range to that point

### Requirement: Zero-Friction Session Start
The system MUST provide a primary "Start Optimal Session" action with secondary customization and tertiary manual browsing options.

#### Scenario: Optimal session start
- **WHEN** the user opens the review surface
- **THEN** a single primary action starts the optimal session

### Requirement: Progressive Disclosure Item Cards
Queue items MUST provide three disclosure levels: default summary, expanded metrics, and inspector details.

#### Scenario: Default view shows minimal fields
- **WHEN** items are listed
- **THEN** each item shows title, time estimate, priority signal, and status icon

#### Scenario: Expanded metrics available
- **WHEN** the user expands or hovers an item
- **THEN** FSRS metrics (stability, difficulty, retrievability, interval change) are shown

### Requirement: FSRS Inspector Details
The system MUST provide an inspector panel with full FSRS state, historical review graph, scheduling rationale, and advanced overrides.

#### Scenario: Inspector shows FSRS rationale
- **WHEN** a user selects an item
- **THEN** the inspector explains why it is scheduled now

### Requirement: Priority Vector Visualization
The system MUST replace scalar priority with a multidimensional priority vector (retention risk, cognitive load, time efficiency, user intent, overdue penalty) and display it compactly with a drill-down breakdown.

#### Scenario: Priority vector displayed
- **WHEN** an item is shown in the queue
- **THEN** a compact priority glyph is visible with a breakdown on hover

### Requirement: Priority Strategy Presets
The system MUST offer priority strategy presets that adjust weighting of the priority vector without altering FSRS algorithms.

#### Scenario: Preset changes weighting
- **WHEN** the user selects "Maximize Retention"
- **THEN** the priority vector weighting updates and the queue reorders accordingly

### Requirement: Honest Time Estimation
The system MUST present per-item time estimates with confidence bands and variance warnings based on item type and historical performance.

#### Scenario: Confidence band shown
- **WHEN** an item has high time variance
- **THEN** the UI displays an estimate range and warning indicator

### Requirement: Session Cut-Off Guarantees
The system MUST provide a pre-session message that communicates total time range and a safe stop item that does not penalize scheduling.

#### Scenario: Safe stop communicated before starting
- **WHEN** the user initiates a session
- **THEN** the UI shows the estimated duration range and a safe stop item count

### Requirement: Session Continuity Feedback
The system MUST show items remaining, time remaining, and session goal during review.

#### Scenario: Session metrics visible
- **WHEN** a review is active
- **THEN** remaining items and time are displayed persistently

### Requirement: FSRS Transparency Panel
The system MUST provide an optional FSRS transparency panel that shows live parameters, plain-language explanations, and simulations of answer choices or suspensions.

#### Scenario: Simulate answer impact
- **WHEN** the user simulates "Hard"
- **THEN** the next interval and stability changes are shown

### Requirement: Reading and Review Queue Separation
The system MUST separate reading and review queues while providing explicit conversion pathways (Reading → Extract → Cloze → Review).

#### Scenario: Conversion pathway visible
- **WHEN** a reading item is selected
- **THEN** the UI shows pathways and their downstream review impact

### Requirement: Incremental Reading Impact Preview
The system MUST show the expected future card impact for reading items (e.g., cards generated per day/time).

#### Scenario: Impact preview shown
- **WHEN** a reading item is opened
- **THEN** the expected future review load is displayed

### Requirement: Drifted State for Overdue Items
The system MUST replace overdue styling with a neutral drifted state and provide recovery actions (compress intervals, reschedule, downgrade frequency).

#### Scenario: Drifted recovery options
- **WHEN** an item is overdue
- **THEN** the UI presents recovery actions without punitive styling

### Requirement: Keyboard-First Navigation
The system MUST support keyboard navigation for queue traversal, session controls, and inspector access.

#### Scenario: Keyboard navigation works
- **WHEN** the user presses navigation shortcuts
- **THEN** focus and selection move without mouse input

### Requirement: Power-User Toggles
The system MUST provide power-user toggles for raw FSRS values, JSON view, batch operations, and scriptable session presets.

#### Scenario: Raw FSRS toggle
- **WHEN** the user enables raw metrics
- **THEN** raw FSRS values are displayed in the inspector

### Requirement: Scalability Performance Targets
The system MUST remain responsive with large queues, using virtualization when needed to keep session navigation smooth.

#### Scenario: Large queue responsiveness
- **WHEN** the queue contains 1,000+ items
- **THEN** scrolling and selection remain responsive without noticeable lag
