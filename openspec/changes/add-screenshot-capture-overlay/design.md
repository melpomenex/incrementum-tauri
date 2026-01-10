## Context
Screenshot capture exists in the UI but the Rust backend is disabled pending migration from `screenshots` to `xcap`. Users want to trigger capture from the toolbar or a configurable shortcut, and to choose what to capture within or outside the app.

## Goals / Non-Goals
- Goals:
  - Restore screenshot capture using `xcap` in the Tauri backend.
  - Provide a capture overlay that supports region, window (app), and full-screen targets.
  - Expose a configurable keyboard shortcut for capture in Settings.
- Non-Goals:
  - OCR for screenshots.
  - Advanced annotation/editing tools for screenshots.

## Decisions
- Decision: Use `xcap` for cross-platform capture to replace the deprecated `screenshots` crate.
  - Alternatives considered: keeping `screenshots` (deprecated/disabled), native OS APIs (higher maintenance).
- Decision: Implement a single capture entry point used by both toolbar and shortcut.
  - Rationale: avoids divergent logic and ensures consistent behavior.

## Risks / Trade-offs
- Overlay UX may vary by platform due to windowing constraints; keep fallback to full-screen capture if overlay is unavailable.

## Migration Plan
1) Add new `xcap`-backed capture commands.
2) Wire toolbar and shortcut to the unified capture flow.
3) Update UI to present capture choices and region selection.

## Open Questions
- None.
