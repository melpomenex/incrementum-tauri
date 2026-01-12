# Change: Add browser extension connection

## Why
The desktop app and browser extension are misaligned on the connection port, so links and extracts fail to reach the app reliably.

## What Changes
- Align browser extension defaults and permissions to `127.0.0.1:8766`.
- Formalize the HTTP Browser Sync Server contract for saving pages/extracts.
- Surface connection configuration and status for the extension in settings.

## Impact
- Affected specs: `specs/browser-extension-sync/spec.md` (new)
- Affected code: `browser_extension/*`, `src-tauri/src/browser_sync_server.rs`, `src/components/settings/IntegrationSettings.tsx`, `src/api/integrations.ts`
