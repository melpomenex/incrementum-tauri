# Design: Command Palette URL Import

## Overview
This feature enables users to paste URLs directly into the command palette for quick import. The system detects the URL type, fetches metadata preview, and performs the import without leaving the command palette context.

## Architecture

### URL Type Detection
```
Input URL → Pattern Matching → Type Determination
                     ↓
    - YouTube: youtube.com, youtu.be patterns → Video
    - RSS/Feed: /feed, .rss, .xml, /atom → Feed subscription
    - Other: → Web article/document
```

### Component Structure
```
GlobalSearch (enhanced)
  ├── URL detection hook (useURLDetector)
  │   ├── isYouTubeURL()
  │   ├── isRSSFeedURL()
  │   └── getURLType()
  ├── ImportPreview component (new)
  │   ├── YouTubePreview
  │   ├── RSSFeedPreview
  │   └── WebPagePreview
  └── ImportActions component (new)
      ├── Import button
      ├── Configure options (tags, collection)
      └── Cancel/Dismiss
```

### Data Flow
```
1. User pastes URL in command palette
2. useURLDetector detects URL type
3. Trigger metadata fetch based on type
4. Show ImportPreview with fetched data
5. User confirms import
6. Execute import via existing APIs
7. Show toast notification
8. Palette remains open for more imports
```

## Key Design Decisions

### 1. URL Detection Strategy
- **Approach**: Pattern-based detection with regex
- **Rationale**: Fast, no backend calls needed for type detection
- **Trade-offs**: May misclassify some URLs, but user can correct

### 2. When to Fetch Metadata
- **Approach**: Debounced fetch after URL pattern is detected (500ms pause)
- **Rationale**: Prevents excessive network calls while typing
- **Alternative considered**: Fetch on every keystroke (rejected: too chatty)

### 3. Import Feedback
- **Approach**: Toast notification, palette stays open
- **Rationale**: Supports batch importing (paste multiple URLs in sequence)
- **Alternative considered**: Auto-navigate to imported item (rejected: breaks flow)

### 4. Error Handling
- **Approach**: Inline error message in palette, with retry option
- **Rationale**: User stays in context, can easily fix typos
- **Scenarios**: Invalid URL, fetch failure, no transcript available

## Integration Points

### Existing APIs Used
- YouTube: `extractYouTubeID()`, `fetchYouTubeVideoInfo()`, `fetchYouTubeTranscript()`, `import_youtube_video_as_document` command
- RSS: `fetchFeed()`, `subscribeToFeed()`
- Web: Need to add `importWebPage()` or leverage existing import dialogs

### New Components
- `ImportPreview`: Shows fetched metadata (title, thumbnail, description)
- `ImportOptions`: Quick settings before import (tags, collection)
- `URLImporter`: Orchestrates the import process

## Edge Cases

### 1. URL Variations
- Shortened URLs (bit.ly, etc.) - Resolve before type detection
- YouTube URLs with timestamps - Preserve timestamp for import
- Playlist URLs - Offer to import playlist vs single video

### 2. Import Conflicts
- Duplicate detection: Check if URL already imported
- Update vs new: Offer options if content exists

### 3. Network Failures
- Timeout handling: Show loading indicator, timeout after 10s
- Offline mode: Queue import for later (future enhancement)

## Implementation Considerations

### Performance
- Debounce URL detection to avoid excessive pattern matching
- Cache recently imported URLs to avoid duplicate checks
- Lazy load preview components

### Accessibility
- Keyboard-only operation: Tab to import options, Enter to confirm
- Screen reader announcements for URL detection and import status
- Focus management after import (back to input for next paste)

### Security
- URL validation: Only accept http(s) protocols
- XSS prevention: Sanitize fetched metadata before display
- Rate limiting: Prevent abuse of metadata fetching
