# Change: Add screenshot capture overlay and shortcut

## Why
Screenshot capture is currently disabled in the backend and the toolbar action is a stub. Users need an in-app way to select a capture region/window/screen, and a configurable shortcut to trigger it.

## What Changes
- Re-enable screenshot capture by migrating the Rust backend to `xcap`.
- Add an in-app capture overlay that lets users choose region, app window, or screen.
- Wire the toolbar screenshot button to the capture flow.
- Add a configurable keyboard shortcut for screenshot capture in Settings.

## Impact
- Affected specs: screenshot-capture (new)
- Affected code: `src-tauri/src/screenshot.rs`, Tauri command registration, `src/components/Toolbar.tsx`, shortcut settings/handlers, screenshot UI flow
