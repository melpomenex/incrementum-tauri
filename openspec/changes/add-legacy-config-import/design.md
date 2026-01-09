## Context
Legacy Incrementum backups are stored as `.config/Incrementum` directories and may be packed as `.zip` or `.7z` archives. The current app needs a merge import that preserves existing data while importing legacy documents, extracts, and learning items. Legacy databases may have schema drift.

## Goals / Non-Goals
- Goals:
  - Import legacy archives from the Import/Export settings panel.
  - Support `.zip` and `.7z` archives.
  - Migrate legacy database schema to current schema prior to merge.
  - Merge duplicate documents by identity and attach legacy extracts.
  - Preserve learning item scheduling integrity.
- Non-Goals:
  - Import settings/preferences.
  - Replace local database.

## Decisions
- Decision: Use an explicit import command that extracts the archive to a temp directory, locates the legacy database, runs migrations, then merges into the live database.
- Decision: Duplicate documents are detected by file identity (path and/or content hash) and merged by attaching extracts to the existing document.

## Risks / Trade-offs
- Schema mismatch may require partial migrations or data normalization; mitigation: run the standard migration pipeline against the legacy DB before merge and log any schema gaps.
- Large archives may increase import time; mitigation: stream extraction and provide progress updates.

## Migration Plan
- Extract archive to a temp workspace.
- Locate `incrementum.db` and related document files.
- Apply migrations to the legacy DB up to current version.
- Merge documents/extracts/learning items into the current DB.
- Cleanup temporary files.

## Open Questions
- None.
