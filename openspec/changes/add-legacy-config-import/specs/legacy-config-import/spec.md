## ADDED Requirements

### Requirement: Legacy archive import
The system MUST allow users to import legacy `.config/Incrementum` archives from the Import/Export settings panel using `.zip` or `.7z` files.

#### Scenario: User selects a legacy archive
- **WHEN** the user selects a `.zip` or `.7z` legacy archive in the Import/Export settings panel
- **THEN** the system accepts the file and begins the legacy import flow

### Requirement: Schema reconciliation
The system MUST reconcile schema differences by migrating the legacy database to the current schema before merge.

#### Scenario: Legacy database schema is older
- **WHEN** the legacy database schema version is behind the current schema
- **THEN** the system applies migrations to bring the legacy database to the current schema before merging data

### Requirement: Merge behavior
The system MUST merge imported documents and extracts into the current database without replacing existing data.

#### Scenario: Duplicate document detected
- **WHEN** an imported document matches an existing document by identity
- **THEN** the system merges extracts into the existing document and avoids creating a duplicate document record

### Requirement: Import scope
The system MUST import only data (documents, extracts, learning items, review history) and MUST NOT import settings/preferences.

#### Scenario: Legacy archive contains settings
- **WHEN** the archive includes settings or preferences data
- **THEN** the system ignores settings content during import

### Requirement: Import reporting
The system MUST report import progress and provide a summary of imported items.

#### Scenario: Import completes
- **WHEN** the import finishes
- **THEN** the user sees a summary of counts for imported documents, extracts, and learning items
