## Context
The review and reading queues are currently list-oriented and under-explain scheduling decisions. The new experience must foreground FSRS reasoning, time budgeting, and incremental reading conversion pathways while keeping the default UI low-friction.

## Goals / Non-Goals
- Goals: FSRS transparency, time-as-currency, session-aware queues, progressive disclosure, multidimensional priority, and scalability for large libraries.
- Non-Goals: gamification, opaque scheduling, or rewriting the FSRS algorithm itself.

## Decisions
- Decision: Present queues as session-aware blocks with explicit time budgets and safe stop points.
  - Why: aligns UI with user time and fatigue rather than raw item counts.
- Decision: Separate reading and review queues while showing explicit conversion pathways.
  - Why: reduces conceptual overload and supports incremental reading workflows.
- Decision: Use progressive disclosure for item cards and an inspector for full FSRS state and history.
  - Why: keeps default UI clean while enabling deep inspection.
- Decision: Replace scalar priority with a priority vector and preset weighting strategies.
  - Why: makes trade-offs visible and tunable without changing FSRS.
- Decision: Provide a transparency panel with simulations and override tools.
  - Why: gives advanced users explainability and control.

## Risks / Trade-offs
- Risk: Increased UI complexity could overwhelm new users.
  - Mitigation: keep defaults minimal and gate advanced panels behind toggles.
- Risk: Missing or noisy time estimates could erode trust.
  - Mitigation: show confidence bands and explicitly communicate uncertainty.
- Risk: Performance regression with large queues.
  - Mitigation: virtualize lists and batch-render FSRS metrics.

## Migration Plan
- Phase the rollout: session blocks and inspector first, then priority vector/presets, then transparency panel and power features.
- Preserve existing review flows so users can continue without retraining.

## Open Questions
- Confirm where FSRS state and historical review data can be sourced for inspector and simulations.
- Confirm which time-estimation heuristics and telemetry are available for confidence bands.
