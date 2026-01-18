## Context
The PWA uses a tab-based UI with a single catch-all route under HashRouter. The mobile bottom nav currently uses URL paths that do not map to real routes, making it non-functional. There are duplicate mobile navigation implementations.

## Goals / Non-Goals
- Goals:
  - Mobile bottom nav opens/activates the correct tabs (Dashboard, Documents, Review, RSS, Stats, Queue, Settings).
  - Nav is hidden during full-screen reading experiences.
  - PWA install prompt appears in browser only when installable and not already installed.
  - Offline experience supports app shell, cached documents, review queue, RSS cache, and analytics.
- Non-Goals:
  - Redesign of desktop navigation
  - New offline sync protocols beyond existing capabilities

## Decisions
- Decision: Bottom nav will dispatch tab-store actions rather than relying on URL routing.
  - Rationale: The app’s primary navigation is tab-based and the router currently uses a catch-all layout.
- Decision: Maintain a single mobile navigation component as source of truth.
  - Rationale: Avoid divergence and inconsistent behavior across mobile layouts.
- Decision: Offline caching will prioritize read-only access to cached content for key screens, with clear offline indicators.

## Risks / Trade-offs
- Risk: Tab store state could drift from URL for deep links.
  - Mitigation: Keep hash route for top-level app and rely on tab activation for mobile nav.
- Risk: Caching sensitive or large content increases storage.
  - Mitigation: Limit offline caches to configured data sets and provide clear cache controls.

## Migration Plan
- Update mobile nav component to use tab-store actions.
- Align install prompt gating and offline indicators with PWA-only environments.
- Increment service worker cache version if caching strategy changes.

## Open Questions
- None (requirements confirmed for bottom nav items, fullscreen behavior, and offline scope).
