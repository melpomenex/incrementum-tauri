## Context
The app ships multiple built-in dark themes. Several UI elements (buttons, pills, text, and badges) are hard to read in some themes due to low contrast or inconsistent token usage. This change focuses on improving built-in dark theme palettes rather than adding new theme infrastructure.

## Goals / Non-Goals
- Goals:
  - All built-in dark themes meet consistent contrast targets across app surfaces.
  - Semantic colors (success/warning/error) remain legible and distinct.
  - Visual polish improves without redesigning layout or component structure.
- Non-Goals:
  - Changing light themes.
  - Adding new theme editor capabilities or validation for custom themes.
  - Introducing new theme selection UX.

## Decisions
- Decision: Use WCAG 2.1 AA contrast targets as the baseline.
  - Normal text and button labels: 4.5:1 minimum.
  - Large text/icons (>= 18pt or 14pt bold): 3:1 minimum.
- Decision: Focus on built-in dark themes only (7 dark themes at time of writing).
- Decision: Use existing theme tokens and mappings in `ThemeContext` as the primary levers; prefer palette tuning over per-component overrides.

## Risks / Trade-offs
- Some dark themes may lose their original aesthetic if contrast is increased aggressively; careful palette tuning is required.
- If any components bypass theme tokens, additional targeted fixes may be needed.

## Migration Plan
- No data migrations. Updates are to theme color tokens and related UI token mapping only.

## Open Questions
- None.
