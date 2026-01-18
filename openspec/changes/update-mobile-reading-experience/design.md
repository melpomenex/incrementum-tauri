## Context
The PWA experience on phones currently emphasizes generous spacing that reduces information density. The reading surfaces (RSS, EPUB, HTML/Markdown) have inconsistent typography and margins, which breaks the sense of a premium reading experience.

## Goals / Non-Goals
- Goals:
  - Establish a compact-but-readable mobile density profile across PWA screens
  - Deliver a premium reading experience on phones with consistent typography and layout rules
  - Keep touch targets accessible while reducing excess padding and chrome
- Non-Goals:
  - PDF reading improvements (explicitly deferred)
  - Desktop visual refresh or large-scale redesign

## Decisions
- Decision: Introduce mobile density tokens (spacing, font sizes, header heights) applied only in PWA/mobile breakpoints.
  - Why: Centralizes the compact layout rules and avoids ad-hoc per-screen tweaks.
- Decision: Normalize reading view layout for RSS, EPUB, and HTML/Markdown to a shared set of typography and margin rules.
  - Why: Consistency is key for a premium reading feel and reduces design drift.

## Risks / Trade-offs
- Tighter spacing can reduce perceived comfort if not balanced with typography and line-height.
  - Mitigation: Define explicit minimum touch target sizes and readable line-lengths.

## Migration Plan
- Add mobile density tokens and adopt them in PWA layouts.
- Update reading view containers and typography styles for RSS, EPUB, and HTML/Markdown.
- Validate on common phone widths (small, regular, large).

## Open Questions
- None.
