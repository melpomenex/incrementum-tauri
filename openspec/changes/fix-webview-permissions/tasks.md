# Tasks: Fix Webview Permissions

## 1. Implementation
- [x] Add `core:webview:allow-set-webview-position` to `src-tauri/capabilities/default.json`.

## 2. Verification
- [ ] Verify that the "webview.set_webview_position not allowed" error no longer appears in the console.
- [ ] Verify that the webview is correctly positioned and resized when the window size changes.
