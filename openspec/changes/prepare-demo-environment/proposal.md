# Prepare Demo Environment

## Metadata
- **Change ID:** prepare-demo-environment
- **Status:** Proposed
- **Created:** 2026-01-18

## Summary
Prepare the application for demo/web deployment by:
1. Setting milky-matcha as the default theme (light theme is better for demos)
2. Fixing APKG import counting bug where 4-5x as many items are imported
3. Adding a demo content directory for books/.apkg files that auto-import on first run

## Problem Statement

### Problem 1: Default Theme Not Ideal for Demos
The current default theme is "modern-dark", but the dark themes in the application are described as "not that great right now." The "milky-matcha" theme is a well-designed light theme with calming green tea-inspired colors that would present better for demos and new users visiting the web URL.

### Problem 2: APKG Import Counting Bug
When importing an .apkg file, the application reports importing 4-5x as many items as are actually in the collection. This appears to be related to card vs note counting - a single note in Anki can have multiple cards (front/back, different card types), but users expect to see the count of unique notes/cards, not an inflated number.

### Problem 3: No Demo Content
When users visit the web URL, there's no demo content available to try. The application starts empty, which makes it difficult for users to understand the app's capabilities without having their own content ready.

## Proposed Solution

### Solution 1: Change Default Theme
- Update `src/config/defaultSettings.ts` to set `theme: 'milky-matcha'` as default
- The milky-matcha theme is already defined in `src/themes/builtin.ts`

### Solution 2: Fix APKG Import Counting
- Investigate the import functions in `src-tauri/src/anki.rs` to understand the counting issue
- The current code iterates through cards and creates learning items for each card
- The issue may be that one note generates multiple cards, and the current counting shows card count rather than unique item count
- Update the import result to accurately reflect the number of items imported

### Solution 3: Add Demo Content Directory
- Create a `demo/` directory at the project root or configurable location
- Add a startup check for demo content (.apkg files, books in EPUB/PDF format)
- Auto-import demo content on first run if the database is empty
- Provide an option in settings to re-import demo content

## Scope

### Affected Files
- `src/config/defaultSettings.ts` - Change default theme
- `src-tauri/src/anki.rs` - Fix APKG import counting (investigation needed)
- `src/components/settings/ImportExportSettings.tsx` - May need update for count display
- New: `src-tauri/src/demo.rs` - Demo content import module
- New: `demo/` directory - Place for demo .apkg and book files

### Cross-Platform Considerations
- The demo content directory should work for Tauri (desktop) and potentially web/PWA deployments
- For web deployment, demo content may need to be served from a public URL

## Risks

### Risk 1: Theme Change May Affect Existing Users
- Changing default theme affects new installations only
- Existing users have their theme preference stored in settings
- Mitigation: Document this as a new-user-facing change only

### Risk 2: APKG Counting Fix May Require Investigation
- The exact cause of 4-5x count needs verification
- May be related to how Anki stores notes vs cards
- Mitigation: Add logging to understand the actual import process

### Risk 3: Demo Content Auto-Import May Be Unexpected
- Users may not want auto-imported content
- Mitigation: Only import on truly empty database, add opt-out

## Open Questions

1. **Demo Content Location:** Should the demo directory be at project root, user data directory, or configurable?
   - Recommendation: Configurable via environment variable or settings file

2. **Demo Content Sources:** What demo content should be included?
   - Recommendation: Start with sample .apkg files showing basic flashcards, add book examples later

3. **APKG Counting Behavior:** Should the count show notes or cards?
   - Recommendation: Show unique learning items created (what the user actually sees)

4. **Theme for Web:** Should web/PWA users also default to milky-matcha?
   - Recommendation: Yes, consistent default across all platforms
