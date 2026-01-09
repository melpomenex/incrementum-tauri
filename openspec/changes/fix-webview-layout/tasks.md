# Tasks: Fix Webview Layout

## 1. Investigation & Reproduction
- [x] Verify the current layout behavior of `WebBrowserTab` and its parent containers.
- [x] Confirm if `min-h-0` or explicit height constraints are missing in the flex chain.

## 2. Implementation
- [x] Update `src/components/tabs/WebBrowserTab.tsx` to apply robust flexbox sizing (e.g., `flex-1 min-h-0 w-full`).
- [x] Add a ResizeObserver or ensure the existing one triggers `updateWebviewBounds` reliably on layout changes.
- [x] (Optional) Add debug logging to `updateWebviewBounds` to print `rect` vs `window.innerHeight`.

## 3. Verification
- [ ] Verify that the webview fills the expected area (below the toolbar, right of the sidebar).
- [ ] Verify that resizing the window updates the webview bounds correctly.