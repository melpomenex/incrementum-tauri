## Context
Users want a dependable, manual export of their collections to mitigate IndexedDB loss and enable portable backups. The app already exposes Import/Export and cloud backup UI, but lacks a guaranteed local export path that works in browser/PWA and Tauri with a single archive containing data, files, settings, and Anki-compatible flashcards.

## Goals / Non-Goals
- Goals: Provide a single downloadable ZIP export for current or all collections; include full data + documents/media + settings + `.apkg`; support round-trip restore; consistent UX in Settings → Import/Export.
- Non-Goals: Implement cloud sync or background automatic backups; change existing cloud provider backup flow.

## Decisions
- Decision: Use a single ZIP export as the primary artifact, containing a manifest, dataset JSON, media files, and a generated `.apkg`.
- Decision: Keep export UI in Settings → Import/Export with explicit scope selection.
- Decision: Export works in Browser/PWA using IndexedDB + File API, and in Tauri via command that writes a ZIP to disk.

## Risks / Trade-offs
- Large exports (media) can be big; mitigate by showing size estimates and progress.
- `.apkg` generation must preserve scheduling/IDs where possible to support continuity with Anki.

## Migration Plan
No migration; additive capability.

## Open Questions
- None (scope, format, and round-trip behavior confirmed).
