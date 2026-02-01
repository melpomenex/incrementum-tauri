# Change: Add archive option for completed YouTube videos

## Why
Users want to keep completed YouTube videos searchable without keeping them in the review queue.

## What Changes
- Add an archive action at the end of YouTube playback that preserves the document link but removes it from scheduling.
- Exclude archived YouTube documents from all queue modes while keeping them discoverable via search.

## Impact
- Affected specs: document-archiving (new)
- Affected code: YouTube viewer end-of-video flow, queue filtering, search indexing/filters
