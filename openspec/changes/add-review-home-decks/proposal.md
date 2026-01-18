# Change: Add review home, study decks, and tag-based filtering

## Why
Users want to focus their study sessions by deck (e.g., German vs history) and quickly see review stats before starting. The current flow jumps directly into review without a deck-aware home or global deck filtering.

## What Changes
- Add a Review home page with session stats, quick actions, and deck navigation.
- Introduce study deck selection that filters review queues and document/library views.
- Add a tag manager to associate non-Anki items with decks.
- Persist the active deck selection between sessions.
- Keep Anki import support scoped to `.apkg` only.

## Impact
- Affected specs: `review-home`, `study-decks`, `tag-management`.
- Affected code: review routes/components, queue/document search filtering, settings persistence, Anki import tagging.
