# Change: Update Scroll Mode Queue for YouTube, Transcript Handoff, and Queue Entry

## Why
Scroll mode should support the full incremental reading queue (including YouTube) with TikTok-style vertical paging, and starting an optimal session should launch that queue experience instead of flashcard review.

## What Changes
- Include YouTube items in scroll mode and persist video position during scroll sessions.
- Treat scroll mode as a full-queue, TikTok-style vertical paging experience across all item types.
- When the user reaches the transcript section of a YouTube item, scrolling past its bounds advances to previous/next queue items.
- Update the primary "Start Optimal Session" action to open the incremental reading queue in scroll mode.

## Impact
- Affected specs: scroll-mode-queue (new), video-progress (new), queue-entry (new)
- Affected code: `src/pages/QueueScrollPage.tsx`, `src/pages/QueuePage.tsx`, `src/components/viewer/YouTubeViewer.tsx`, queue navigation hooks, scroll container behavior
