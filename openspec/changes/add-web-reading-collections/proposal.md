# Change: Add Web Reading Parity for Collections, PDF Context, and Graph

## Why
Web users need the same Incrementum reading flow as Tauri: persistent progress, assistant-aware PDF context, extract-to-learning workflows, reliable FSRS resume behavior, and navigable collection tooling (Read Next/Random). Knowledge Graph visualization is also needed to make relationships visible across documents, extracts, and learning items.

## What Changes
- Add collection management (default demo collection, create/switch collections) and use it as the scope for queues, navigation, and graph.
- Persist reading progress for PDFs across devices, honoring sync policy (demo vs authenticated).
- Provide assistant context for PDFs using a sliding text window around current position/selection, respecting the user-configured token budget and optional OCR text.
- Unify selection-based extract creation to support extracts, cloze deletions, and Q&A cards from the same flow.
- Fix FSRS review continuity so sessions resume from due items instead of restarting from the deck beginning.
- Implement a Knowledge Graph view (Obsidian-like) that visualizes documents, extracts, and learning items with interactive navigation.
- Wire toolbar actions: Read Next follows FSRS due order; Random Item opens a random queue item within the active collection.

## Impact
- Affected specs: new capabilities for collection management, reading progress sync, assistant document context, extract learning flow, FSRS queue continuity, knowledge graph, and queue navigation.
- Affected code: viewer context + PDF text pipeline, queue scheduling/resume flow, toolbar navigation, knowledge graph UI, and collection scoping across stores/queries.
- Dependencies: aligns with `add-user-profile-and-auth` and `sync-policy` changes for cross-device persistence and Demo Mode behavior.
