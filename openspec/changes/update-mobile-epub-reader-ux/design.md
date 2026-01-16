## Context
The EPUB viewer currently renders with a desktop layout (sidebar TOC, floating controls) and broad CSS overrides that are not tuned for small screens. Mobile reading benefits from constrained line length, safe-area aware padding, and minimal UI chrome that can be toggled during reading.

## Goals / Non-Goals
- Goals:
  - Deliver a mobile-first EPUB reading layout that is readable, touch-friendly, and consistent in PWA and mobile browser.
  - Provide lightweight, tap-toggle controls for navigation, settings, and TOC access.
  - Show reading progress and chapter context during mobile reading.
- Non-Goals:
  - Adding new backend storage or server APIs.
  - Implementing highlights/bookmarks beyond existing selection flows.

## Decisions
- Decision: Detect mobile mode using existing device info and apply a dedicated mobile layout branch in the EPUB viewer.
  - Why: Avoids impacting desktop layout while enabling tailored mobile UI.
- Decision: Use epub.js rendition hooks to apply mobile typography and padding inside the EPUB iframe.
  - Why: Ensures EPUB content styling is consistent and readable regardless of embedded styles.
- Decision: Use tap-to-toggle chrome with minimal top/bottom bars and a sheet/drawer for TOC.
  - Why: Matches mobile reading best practices and keeps the reading surface uncluttered.
- Decision: Derive progress from epub.js locations and current location; present it in a compact, low-contrast indicator.
  - Why: Provides progress context without heavy UI.

## Risks / Trade-offs
- Overriding EPUB internal styles could break certain fixed-layout books; mitigated by keeping overrides minimal and scoped to mobile mode.
- Mobile tap zones may conflict with selection; mitigated by disabling navigation taps while selection is active.

## Migration Plan
- Frontend-only change; no data migration needed.
- Release behind standard build; confirm on iOS Safari, Android Chrome, and PWA install.

## Open Questions
- None (requirements based on mobile reading best practices as requested).
