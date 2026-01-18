# apkg-import-fix Specification Delta

## MODIFIED Requirements

### Requirement: Accurate APKG Import Count
The system SHALL report the accurate number of unique learning items created during APKG import, not the total number of cards processed.

#### Scenario: User imports APKG and sees accurate item count
- **Given** the user imports an .apkg file containing 10 notes with 2 cards each
- **When** the import completes
- **Then** the system should report importing approximately 10 items (not 20 or more)
- **And** the database should contain exactly the number of unique learning items reported
- **And** duplicate items based on note GUID should not be created

#### Scenario: Multi-deck APKG imports without cross-deck duplicates
- **Given** an .apkg file contains 2 decks that reference the same notes
- **When** the user imports the file
- **Then** each unique note should create only one learning item
- **And** the reported count should reflect unique items, not total card count

#### Scenario: Cloze cards import as single items
- **Given** an .apkg file contains cloze deletion notes
- **When** the user imports the file
- **Then** each cloze note should create one learning item
- **And** multiple cloze card variants from the same note should not create duplicate items

### Requirement: Import Result Feedback
The system SHALL provide clear feedback about the number of items actually imported.

#### Scenario: Import completion shows accurate count
- **Given** the user completes an .apkg import
- **When** the import finishes
- **Then** a message should show "Imported N items" where N is the unique learning items created
- **And** the user should be able to verify the count in their learning items list
