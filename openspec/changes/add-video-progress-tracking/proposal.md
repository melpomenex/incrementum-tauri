# Proposal: Video Progress Tracking

## Change ID
`add-video-progress-tracking`

## Summary
Add persistent timestamp tracking for video content (YouTube and local video/audio files) so the app remembers the user's playback position and automatically resumes from where they left off.

## Problem Statement
Currently, when a user watches a video in Incrementum-CPP and then navigates away or closes the app, their playback position is lost. They must manually seek to their previous position when they return to the video. This creates a poor learning experience for:

1. **Long-form educational content** - Users watching hour-long lectures lose their place
2. **Incremental learning** - The app's philosophy of spaced repetition is undermined for video content
3. **Multi-session viewing** - Users cannot pause and resume across sessions

### Current State
- YouTube videos are stored with `total_pages` field representing duration in seconds
- `current_page` field exists but is only used for page-based content (PDF, EPUB)
- Video position is tracked in frontend state only (`YouTubeViewer.tsx:32`)
- No database field exists for storing current video timestamp

### Impact
- Users must manually remember or note their position in long videos
- Friction in the learning workflow breaks immersion
- Video content is treated as second-class compared to PDF/EPUB which have `current_page` tracking

## Proposed Solution
Add a new `current_timestamp` field to the documents table to store the playback position (in seconds) for time-based media types (YouTube, Video, Audio).

### Key Features
1. **Database Schema Addition**: Add `current_timestamp INTEGER` column to documents table
2. **Auto-Save**: Automatically save position every 10 seconds during playback
3. **Auto-Resume**: Automatically seek to saved position when video loads
4. **Reset on Completion**: Clear timestamp when video is watched to completion
5. **Progress Indication**: Show resume position in document list (e.g., "Resume at 12:34")

## Scope
### In Scope
- Database migration for `current_timestamp` field
- Backend API to update/retrieve timestamp
- YouTube video position auto-save and resume
- Local video player position tracking (when implemented)
- Audio file position tracking
- UI indicator showing resume position

### Out of Scope
- Multiple playback positions per document (bookmarks)
- Watch history analytics
- Video player for local files (separate feature)
- Syncing playback position across devices

## Success Criteria
1. User watches a video for 5 minutes, closes it
2. User returns to the video later
3. Video automatically seeks to approximately 5:00
4. Position is persisted across app restarts

## Alternatives Considered
1. **Reuse `current_page`**: Could store timestamp in `current_page`, but this is semantically confusing and breaks the mental model that `current_page` is for page-based content.

2. **Separate table for video progress**: Over-engineering for a single value per document. The documents table already stores all other progress metrics.

3. **Client-side only storage**: Using localStorage would not persist across devices or survive app data clearing.

## Dependencies
- None - standalone feature
- Builds on existing YouTube integration
- Future: Will integrate with local video player when implemented

## Related Changes
- None directly, but complements the existing document rating/FSRS system
- Similar to how `current_page` works for PDF/EPUB files

## Open Questions
1. **Save frequency**: Is 10 seconds appropriate? Should this be configurable?
2. **Completion threshold**: At what percentage should we consider the video "watched" and clear the timestamp? (e.g., 95%)
3. **Resume prompt**: Should we ask the user before resuming, or always auto-resume?
