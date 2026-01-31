## ADDED Requirements
### Requirement: Collection Export Archive
The system SHALL provide a manual export in Settings → Import/Export that creates a single ZIP archive containing all selected collection data, associated documents/media, settings, and a generated Anki `.apkg` file.

#### Scenario: User exports the active collection
- **WHEN** the user selects “Current collection” and starts export
- **THEN** the system creates a ZIP archive that includes only the active collection’s data, its document/media files, settings, and an `.apkg` for its flashcards

#### Scenario: User exports all collections
- **WHEN** the user selects “All collections” and starts export
- **THEN** the system creates a ZIP archive that includes all collections’ data, all document/media files, settings, and an `.apkg` for all flashcards

### Requirement: Round-trip Restore From Export
The system SHALL allow importing the ZIP export to restore the full application state represented by the archive.

#### Scenario: User restores from an export archive
- **WHEN** the user selects a ZIP export created by the app in the Import section
- **THEN** the system restores the database, documents/media, settings, and flashcards to match the exported state

### Requirement: Cross-Platform Export Availability
The system SHALL provide the export capability in Browser/PWA (IndexedDB-backed) and in Tauri, with consistent UI affordances.

#### Scenario: Export in Browser/PWA
- **WHEN** the app is running in Browser/PWA mode
- **THEN** the system generates and downloads the ZIP archive via the browser

#### Scenario: Export in Tauri
- **WHEN** the app is running in the Tauri desktop environment
- **THEN** the system generates the ZIP archive to a user-selected file path and confirms the saved location
