## 1. Implementation
- [ ] 1.1 Add Import/Export UI support for legacy `.zip`/`.7z` selection and invoke a new Tauri import command.
- [ ] 1.2 Implement archive extraction for `.zip` and `.7z`, with clear validation errors for invalid layouts.
- [ ] 1.3 Locate legacy database in extracted data, run migrations to current schema, and create a merge-ready view.
- [ ] 1.4 Merge documents and extracts into the current database, merging extracts for duplicate documents and skipping settings.
- [ ] 1.5 Merge learning items/review data in a way that preserves review scheduling integrity.
- [ ] 1.6 Add user-visible progress/status reporting and summary of imported items.
- [ ] 1.7 Add tests or validation scripts for archive parsing, migration, and merge behavior.

## 2. Validation
- [ ] 2.1 Manual import of a sample `.zip` legacy archive merges data into current DB without errors.
- [ ] 2.2 Manual import of a sample `.7z` legacy archive merges data into current DB without errors.
- [ ] 2.3 Verify duplicate documents merge extracts and do not create duplicate documents.
