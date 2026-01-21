## Context
The web reader uses epub.js for EPUB rendering and PDF.js for PDFs. EPUB currently renders the first section only and TOC clicks do not navigate. PDF progress persistence exists but does not reliably restore after tab switches or reopen in the web app.

## Goals / Non-Goals
- Goals:
  - Continuous vertical scrolling across the entire EPUB document.
  - Reliable EPUB TOC navigation for all TOC items.
  - Persist and restore PDF page + scroll position across tab switches, document reopen, and app restarts.
- Non-Goals:
  - Redesign reader UI.
  - Add new annotation or search features.
  - Cross-device sync policy changes beyond existing APIs.

## Decisions
- Decision: Configure EPUB rendering for a single continuous scroll flow and ensure the scroll container is the one actually scrolling.
  - Why: epub.js supports scrolled flows; the current layout likely prevents scrolling or sections from loading.
- Decision: Normalize TOC href targets before navigation and use a single navigation path with fallbacks.
  - Why: TOC hrefs can be relative or include fragments; reliable navigation needs normalization.
- Decision: Persist PDF progress on visibility changes and unmount, and restore using a most-recent source of truth.
  - Why: tab switches can happen without scroll events, and stored positions need deterministic restoration.

## Risks / Trade-offs
- EPUB layout overrides may conflict with continuous scroll if they alter container overflow; need to validate with multiple EPUBs.
- PDF restore timing must avoid fighting PDF.js rendering and auto-scroll logic.

## Migration Plan
- No data migration. Existing localStorage keys and server fields are reused.

## Open Questions
- None (requirements provided by user for web app on Linux/macOS).
