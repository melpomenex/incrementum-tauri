## 1. Extension defaults and permissions
- [ ] 1.1 Update extension default host/port to `127.0.0.1:8766` in background/options content.
- [ ] 1.2 Update extension manifest host permissions to allow `http://127.0.0.1:8766/*` (and localhost equivalent).
- [ ] 1.3 Ensure extension connection test and error messaging reflect the HTTP Browser Sync Server.

## 2. App settings alignment
- [ ] 2.1 Confirm the Browser Sync Server config defaults to 8766 and surface the configured URL in Integration Settings.
- [ ] 2.2 Keep auto-start configuration and status polling aligned with the Browser Sync Server commands.

## 3. Validation
- [ ] 3.1 Run extension connection test against a running app server.
- [ ] 3.2 Verify saving a page and an extract from the extension produces a success response.
