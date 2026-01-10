## 1. Implementation
- [ ] 1.1 Migrate screenshot backend to `xcap` and expose capture commands for screen, window, and region selection.
- [ ] 1.2 Add a unified capture flow in the frontend that triggers a capture overlay and returns the chosen image.
- [ ] 1.3 Wire the toolbar screenshot button to the unified capture flow.
- [ ] 1.4 Add a configurable "Capture Screenshot" shortcut (default: Ctrl+Shift+S / Cmd+Shift+S) in shortcut settings and hook it to the capture flow.
- [ ] 1.5 Ensure captured images are saved into the document library as screenshots, consistent with existing metadata.

## 2. Validation
- [ ] 2.1 Run `openspec validate add-screenshot-capture-overlay --strict`.
- [ ] 2.2 Manual: trigger capture from toolbar and shortcut; verify region/window/screen capture and saved screenshot document.
