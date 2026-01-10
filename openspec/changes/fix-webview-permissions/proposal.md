# Fix Webview Permissions

## Metadata
- **Change ID:** fix-webview-permissions
- **Author:** Gemini
- **Status:** Proposed
- **Created:** 2026-01-09

## Summary
Grant the necessary `core:webview:allow-set-webview-position` permission to allow the application to programmatically position the native webview.

## Problem Statement
The user encounters an "Unhandled Promise Rejection: webview.set_webview_position not allowed" error when the application attempts to update the webview bounds. This prevents the webview from being correctly positioned within the tab layout.

## Proposed Solution
- Add `core:webview:allow-set-webview-position` to the `permissions` array in `src-tauri/capabilities/default.json`.

## Scope
- `src-tauri/capabilities/default.json`

## Risks
- None. This is a standard permission required for the implemented functionality.
