# demo-content Specification Delta

## ADDED Requirements

### Requirement: Demo Content Auto-Import
The system SHALL automatically import demo content on first run when the database is empty.

#### Scenario: New user gets demo content automatically
- **Given** a new user launches the application for the first time
- **And** the database contains no learning items
- **When** the application starts
- **Then** the system should check for demo content in the configured directory
- **And** demo .apkg files should be automatically imported
- **And** the user should see sample flashcards to try immediately

#### Scenario: Existing user with data skips demo import
- **Given** a user has existing learning items in their database
- **When** the application starts
- **Then** demo content should not be automatically imported
- **And** the user's existing content should remain unchanged

#### Scenario: User can disable demo content auto-import
- **Given** a user does not want demo content
- **When** they disable "Auto-import demo content" in settings
- **Then** demo content should not be imported even on empty database
- **And** the setting should persist across application restarts

### Requirement: Demo Content Directory
The system SHALL support a configurable demo content directory for sample .apkg and book files.

#### Scenario: Demo directory structure
- **Given** the demo content directory is configured
- **When** the system scans for demo content
- **Then** `.apkg` files in `demo/apkg/` should be detected
- **And** ebook files (EPUB, PDF) in `demo/books/` should be detected
- **And** supported files should be automatically imported

#### Scenario: Custom demo content path
- **Given** an administrator wants to use a custom demo content location
- **When** they set the `DEMO_CONTENT_DIR` environment variable
- **Then** the system should scan the specified directory for demo content
- **And** the custom path should take precedence over the default location

### Requirement: Demo Content Management
The system SHALL provide UI for managing demo content after import.

#### Scenario: User can re-import demo content
- **Given** a user previously imported demo content
- **When** they click "Re-import demo content" in settings
- **Then** the system should re-import demo files
- **And** existing demo items should be updated or re-created

#### Scenario: User can remove demo content
- **Given** a user has demo content imported
- **When** they click "Remove demo content" in settings
- **Then** all items tagged with demo-related tags should be removed
- **And** the user should confirm the deletion action

#### Scenario: Demo content is clearly identifiable
- **Given** a user has demo content imported
- **When** they view their learning items or documents
- **Then** demo items should be clearly marked (e.g., tagged "demo")
- **And** the user should be able to filter demo items separately
