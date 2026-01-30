## 1. URL detection foundation
- [ ] 1.1 Add `useURLDetector` hook with pattern matching for YouTube, RSS, and web URLs
- [ ] 1.2 Add URL type enum (`YouTubeURL`, `RSSFeedURL`, `WebPageURL`, `Unknown`)
- [ ] 1.3 Add URL validation (http/https protocol check)

## 2. Preview UI components
- [ ] 2.1 Create `ImportPreview` component for displaying fetched metadata
- [ ] 2.2 Create `YouTubeImportPreview` with video thumbnail, title, channel, duration
- [ ] 2.3 Create `RSSFeedPreview` with feed title, description, item count
- [ ] 2.4 Create `WebPagePreview` with page title, description, favicon
- [ ] 2.5 Add loading state for metadata fetch
- [ ] 2.6 Add error state with retry option

## 3. Metadata fetching
- [ ] 3.1 Add `fetchURLMetadata()` function that routes to appropriate fetcher
- [ ] 3.2 Integrate existing `fetchYouTubeVideoInfo()` for YouTube URLs
- [ ] 3.3 Integrate existing `fetchFeed()` for RSS URLs
- [ ] 3.4 Add `fetchWebPageMetadata()` for web pages (use /api/article/preview or similar)
- [ ] 3.5 Add debouncing (500ms) for metadata fetch calls

## 4. Import actions
- [ ] 4.1 Create `ImportActions` component with import button and options
- [ ] 4.2 Add quick tag input with autocomplete
- [ ] 4.3 Add collection dropdown selector
- [ ] 4.4 Wire up YouTube import to existing `import_youtube_video_as_document` command
- [ ] 4.5 Wire up RSS subscribe to existing `subscribeToFeed()` function
- [ ] 4.6 Add web page import using existing import dialog or new API

## 5. GlobalSearch integration
- [ ] 5.1 Enhance `GlobalSearch.tsx` to detect URLs in input
- [ ] 5.2 Add state for URL detection, preview data, import options
- [ ] 5.3 Update UI to show `ImportPreview` instead of search results when URL detected
- [ ] 5.4 Handle Enter key to trigger import when URL is active
- [ ] 5.5 Handle Escape key to dismiss URL preview and return to search

## 6. Toast notifications
- [ ] 6.1 Add success toast for YouTube import ("Imported: [video title]")
- [ ] 6.2 Add success toast for RSS subscribe ("Subscribed to: [feed title]")
- [ ] 6.3 Add success toast for web import ("Imported: [page title]")
- [ ] 6.4 Add click-to-navigate on toast notifications
- [ ] 6.5 Add error toast for import failures

## 7. Duplicate detection
- [ ] 7.1 Add check for existing YouTube videos by video ID
- [ ] 7.2 Add check for existing RSS feeds by feed URL
- [ ] 7.3 Show warning state for duplicates with open/re-import options

## 8. Keyboard navigation
- [ ] 8.1 Ensure Tab navigates through import options (tags, collection, import button)
- [ ] 8.2 Ensure Enter triggers import when preview is active
- [ ] 8.3 Ensure Escape clears URL preview and returns to normal search
- [ ] 8.4 Test full keyboard workflow (Ctrl+K → Ctrl+V → Enter)

## 9. Testing and validation
- [ ] 9.1 Manual test: Paste YouTube URL, verify preview and import
- [ ] 9.2 Manual test: Paste RSS feed URL, verify preview and subscribe
- [ ] 9.3 Manual test: Paste article URL, verify preview and import
- [ ] 9.4 Manual test: Batch import multiple URLs in sequence
- [ ] 9.5 Manual test: Duplicate URL handling
- [ ] 9.6 Manual test: Keyboard-only workflow
- [ ] 9.7 Manual test: Error cases (invalid URL, fetch failure)

## 10. Cleanup and polish
- [ ] 10.1 Add loading animations for metadata fetch
- [ ] 10.2 Add smooth transitions between search and import modes
- [ ] 10.3 Ensure proper focus management after import
- [ ] 10.4 Add accessibility labels and ARIA announcements
