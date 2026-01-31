# Change: Add collection export archive

## Why
Users need a reliable, manual export to protect against IndexedDB data loss and to move or back up their collections without relying on cloud sync.

## What Changes
- Add a single-file export archive that includes the full dataset, documents/media, settings, and an Anki `.apkg` flashcard export.
- Provide export scope options (current collection vs all collections) in Settings → Import/Export.
- Support export in both Browser/PWA (IndexedDB) and Tauri, with a consistent UI.

## Impact
- Affected specs: none (new capability)
- Affected code: `src/components/settings/ImportExportSettings.tsx`, `src/lib/browser-backend.ts`, `src/lib/database.ts`, `src-tauri/src/commands/*`
