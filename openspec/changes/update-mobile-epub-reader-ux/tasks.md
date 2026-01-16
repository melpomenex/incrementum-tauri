## 1. Mobile Reader Layout
- [x] 1.1 Audit `src/components/viewer/EPUBViewer.tsx` and `src/components/viewer/DocumentViewer.tsx` for current mobile behavior and identify mobile entry points.
- [x] 1.2 Add a mobile-specific layout branch for EPUB rendering (single-column, safe-area padding, constrained width).
- [x] 1.3 Replace the mobile TOC sidebar with a mobile-friendly overlay or drawer.

## 2. Mobile Chrome and Navigation
- [x] 2.1 Implement tap-to-toggle chrome with compact top/bottom bars for navigation, settings, and TOC access.
- [x] 2.2 Add tap zones for previous/next navigation that do not interfere with text selection.
- [x] 2.3 Add a compact progress indicator driven by epub.js location updates.

## 3. Mobile EPUB Preferences
- [x] 3.1 Wire mobile typography controls (font size, font family, line height) to `src/stores/settingsStore.ts` and apply them in the EPUB rendition.
- [x] 3.2 Update `src/components/settings/DocumentsSettings.tsx` if new mobile-specific controls are introduced.

## 4. Validation
- [ ] 4.1 Manual QA on mobile browser and installed PWA: open EPUB, confirm layout, chrome toggle, TOC, progress, and settings persistence.
- [ ] 4.2 Run existing frontend tests if available (e.g., `npm run test`).
