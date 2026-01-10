## Context
The documents surface currently renders a card grid that shows many fields at once. This becomes difficult to scan as libraries grow and does not emphasize the incremental-reading queue. The redesign needs to support both casual browsing and fast daily workflows without changing the underlying queue algorithm.

## Goals / Non-Goals
- Goals: dual-mode layout, priority visibility, progressive disclosure, inspector panel, power-user search/sort, smart sections, and performance targets.
- Non-Goals: changing the queue ranking logic or implementing new importers.

## Decisions
- Decision: Implement two modes (grid/list) that share a unified selection model and inspector panel.
  - Why: allows fast workflows without losing browse-friendly cards.
- Decision: Derive priority signal and reason from existing document fields (e.g., priorityScore/Rating, extract counts, recent adds) and present a single primary signal per item.
  - Why: avoids backend changes while making queue cues explicit.
- Decision: Keep listing fields minimal; move detailed metadata to inspector.
  - Why: reduces scan noise and improves density.
- Decision: Introduce a tokenized search parser that gracefully falls back to plain text for unknown tokens.
  - Why: enables power-user filtering without a complex UI.

## Risks / Trade-offs
- Risk: Priority reasons may be ambiguous with current metadata.
  - Mitigation: start with simple, transparent heuristics and label them as such.
- Risk: List/table complexity could expand scope.
  - Mitigation: fixed columns for MVP and defer customization.
- Risk: Performance with 1,000+ documents.
  - Mitigation: plan for virtualization and measure in Phase 3.

## Migration Plan
- Phase the work: MVP foundation (mode toggle, list, inspector, search), then power-ups, then performance polish.
- Preserve existing import and document open flows to avoid regressions.

## Open Questions
- Confirm which Documents surface(s) are authoritative in the app shell and ensure the redesign replaces both.
- Confirm the exact priority reason heuristics and their order of precedence.
