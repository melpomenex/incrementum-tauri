## Context
The browser extension uses an HTTP POST-based protocol to send links and extracts to the desktop app. The current default port in the extension (8765) conflicts with Anki and does not match the app’s Browser Sync Server (8766). The extension also needs explicit host permissions to match the configured port.

## Goals / Non-Goals
- Goals: Standardize on port 8766, keep HTTP POST integration, and make configuration visible in settings.
- Non-Goals: Introduce WebSocket transport, add authentication, or expand extraction features.

## Decisions
- Decision: Keep the HTTP Browser Sync Server as the supported integration channel.
- Decision: Use `127.0.0.1:8766` as the default extension target to avoid port conflicts.
- Decision: Update extension host permissions to match the default port and allow user-configured host/port.

## Risks / Trade-offs
- Risk: Localhost HTTP endpoints can be accessed by other local processes. Mitigation: limit to loopback and keep request schema constrained.
- Risk: Port collisions if another service is bound to 8766. Mitigation: keep configuration editable in settings and extension options.

## Migration Plan
- Update extension defaults and permissions.
- Align settings copy and config defaults to 8766.
- Validate extension can send a test payload to the Browser Sync Server.

## Open Questions
- None.
