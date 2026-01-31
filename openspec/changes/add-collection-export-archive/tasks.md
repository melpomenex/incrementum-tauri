## 1. Implementation
- [ ] 1.1 Add export UI section in Settings → Import/Export with scope options (current vs all collections) and format details.
- [ ] 1.2 Implement browser/PWA export command to build a ZIP archive with database JSON, file blobs, settings, and Anki `.apkg`.
- [ ] 1.3 Implement Tauri export command to build the same ZIP archive on disk and return the saved file path.
- [ ] 1.4 Update import flow to accept and restore from the export archive (round-trip restore).
- [ ] 1.5 Add validation and user feedback (size estimates, success/failure messaging).
- [ ] 1.6 Add tests or smoke validation steps for export/import round-trip.
