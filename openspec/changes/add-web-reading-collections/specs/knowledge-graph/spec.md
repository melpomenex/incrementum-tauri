# Spec: Knowledge Graph

## ADDED Requirements

### Requirement: Graph Visualization
The system SHALL provide a Knowledge Graph view that visualizes documents, extracts, and learning items.

#### Scenario: Open Knowledge Graph
- **WHEN** the user opens the Knowledge Graph view
- **THEN** the graph renders nodes for documents, extracts, and learning items
- **AND** edges show document → extract and extract → learning item relationships

### Requirement: Collection Scoping
The Knowledge Graph MUST be scoped to the active collection.

#### Scenario: Graph scoped to collection
- **GIVEN** the user switches to a different collection
- **WHEN** the Knowledge Graph is opened
- **THEN** only items in that collection are rendered

### Requirement: Interactive Navigation
The Knowledge Graph SHALL support navigation to items.

#### Scenario: Navigate from graph
- **WHEN** the user clicks a document or extract node
- **THEN** the corresponding item opens in its viewer
