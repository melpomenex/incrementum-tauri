## Context
The app currently routes directly into a review session and has no deck-scoped filtering across review queues or the library. Anki `.apkg` import already tags items with deck names, but there is no user-facing deck manager or persistent deck selection.

## Goals / Non-Goals
- Goals:
  - Provide a Review home screen with actionable stats and deck entry points.
  - Support a single active study deck that filters review queues and document/library views.
  - Allow non-Anki items to participate in a deck via tag associations.
  - Persist the active deck between sessions.
- Non-Goals:
  - Support Anki import formats beyond `.apkg`.
  - Implement multi-deck simultaneous views or split sessions.

## Decisions
- Decision: Represent a study deck as `{ id, name, tagFilters[] }` persisted in settings/storage.
  - Rationale: Minimal schema and easy to apply to both review queues and document lists.
- Decision: Use tag matching as the inclusion rule for non-Anki items; untagged items are only shown in the "All decks" view.
  - Rationale: Matches the requirement that tags determine deck membership; avoids ambiguous auto-grouping.
- Decision: Reuse existing Anki import tags (deck name) as default tag filters for auto-created study decks.
  - Rationale: No migration needed; aligns Anki deck identity with existing tagging.

## Risks / Trade-offs
- Tag matching could exclude relevant items if users forget to tag; mitigate with clear empty-state guidance and a tag manager CTA.
- Deck naming collisions across sources; mitigate by allowing users to rename study decks independently of tags.

## Migration Plan
- On first load, build study decks from existing Anki-imported deck tags if no decks exist in settings.
- Persist active deck selection in settings; default to "All decks".

## Open Questions
- None.
