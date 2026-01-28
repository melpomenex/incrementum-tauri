# Tasks: Improve RSS Reading Experience

- [ ] Refactor `src/styles/mobile.css` to extract reading variables into a global scope (or new CSS file) accessible to desktop. <!-- id: 0 -->
- [ ] Add new fields to `RSSUserPreference` and `RSSUserPreferenceUpdate` interfaces for reader settings (font family, size, line height, max width). <!-- id: 1 -->
- [ ] Implement the "Reader" tab in `RSSCustomizationPanel.tsx` with controls for the new settings. <!-- id: 2 -->
- [ ] Update `RSSReader.tsx` to apply the user's reading preferences to the article view container. <!-- id: 3 -->
- [ ] (Optional) Update `DocumentViewer.tsx` to share these reading styles if applicable (e.g. for HTML/Markdown docs). <!-- id: 4 -->
- [ ] Verify persistence of settings and their application on reload. <!-- id: 5 -->
