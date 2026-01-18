## Context
Scroll Mode currently renders document, extract, and RSS content without the assistant panel, and it handles navigation independently of the standard document viewer. Fullscreen behavior is implemented in the document viewer but not in the scroll-mode shell, so F11 is ignored when users read via Scroll Mode.

## Goals / Non-Goals
- Goals:
  - Provide an assistant panel alongside Scroll Mode items (documents, extracts, RSS), including web documents.
  - Make F11 toggle app fullscreen in Scroll Mode, with Esc exiting fullscreen.
  - Ensure document ratings in Scroll Mode reschedule the item, remove it immediately from the scroll list, and advance to the next item.
- Non-Goals:
  - Redesign the assistant UI or change its tool capabilities.
  - Alter scheduling logic beyond existing FSRS behavior.
  - Modify rating behavior for flashcards, extracts, or RSS beyond current semantics.

## Decisions
- Decision: Reuse the existing AssistantPanel and context plumbing, adapting it to Scroll Mode items.
  - Why: Minimizes new UI and leverages current assistant configuration.
- Decision: Handle fullscreen toggling at the Scroll Mode container level.
  - Why: Scroll Mode is a distinct reading surface; the user expects F11 to affect the app window regardless of embedded viewer type.

## Alternatives considered
- Inject assistant only for documents and exclude RSS/extracts.
  - Rejected: The request explicitly includes RSS/extracts.
- Use DOM fullscreen (document.documentElement.requestFullscreen) instead of Tauri window fullscreen.
  - Rejected: The app already uses window fullscreen and the request is for app fullscreen behavior.

## Risks / Trade-offs
- Assistant context for RSS/extracts may be less rich than full document content; mitigate by passing best-available text (title/content/selection) and clearly scoped context.

## Migration Plan
No data migration required; UI-only changes.

## Open Questions
- None (requirements clarified).
