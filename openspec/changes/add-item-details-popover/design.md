## Context
Queue and Scroll Mode surfaces do not currently provide a consistent, lightweight way to inspect full scheduling details (FSRS metrics, preview intervals, reps/lapses) for all item types. Review Queue has an inspector, but it is a separate layout and is not available in Scroll Mode.

## Goals / Non-Goals
- Goals:
  - Provide a lightweight popover with consistent item detail and scheduling sections for documents, extracts, learning items, and RSS items.
  - Keep interactions in-context (no navigation or modal flow) and make the popover dismissible with click-out/escape.
  - Load scheduling details on demand and handle missing data gracefully.
- Non-Goals:
  - Redesign the entire queue or scroll experience.
  - Change scheduling behavior or algorithms.

## Decisions
- Use a shared `ItemDetailsPopover` UI component with a small data adapter per item type.
- Fetch or compute scheduling details lazily when the popover opens to minimize background requests.
- Present missing scheduling data as `n/a`/`Not scheduled` rather than hiding sections, so users understand coverage.

## Alternatives considered
- Expand the existing Review Queue inspector to cover all contexts.
  - Rejected because Scroll Mode requires an in-place, non-disruptive UI.
- Dedicated detail pages per item type.
  - Rejected due to navigation overhead and slower workflow.

## Risks / Trade-offs
- Some item types may not currently expose all FSRS fields (e.g., retrievability or preview intervals), which may require new backend command(s) or placeholder values.

## Migration Plan
- Add the popover component and data adapter.
- Add triggers in queue list items and Scroll Mode.
- Validate data availability and fill any gaps with backend support or explicit placeholders.

## Open Questions
- Confirm how to compute or retrieve retrievability for documents/extracts if not exposed by current APIs.
