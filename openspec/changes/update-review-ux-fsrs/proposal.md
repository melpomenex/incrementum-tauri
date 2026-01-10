# Change: FSRS-native review and reading UX overhaul

## Why
The current review and reading queue surfaces do not expose FSRS reasoning, time cost, or session flow clearly enough for power users. A redesign focused on transparency, time budgeting, and incremental reading pathways is needed to surpass SuperMemo-level UX.

## What Changes
- Reframe review and reading queues as session-aware plans with time budgets and safe stop points.
- Add progressive disclosure item cards with FSRS metrics and full inspector transparency.
- Replace scalar priority with a multidimensional priority vector and presets.
- Introduce honest time estimation with confidence bands and session cut-off guarantees.
- Implement a zero-friction start flow and continuous session feedback.
- Add an FSRS transparency panel with simulations and advanced overrides.
- Separate reading vs review queues with explicit conversion pathways.
- Redesign overdue handling as neutral "drifted" state with recovery actions.
- Add keyboard-first navigation and power-user toggles (raw metrics, JSON, batch ops).

## Impact
- Affected specs: review-ux (new)
- Affected code: review and queue pages/tabs, scheduling feedback UI, FSRS-related surfaces, inspector panels, and time/priority estimation logic.
