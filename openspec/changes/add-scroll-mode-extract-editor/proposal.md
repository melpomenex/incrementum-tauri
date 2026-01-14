# Change: Add markdown editing for extracts and imported web articles in scroll mode

## Why
Users want to edit extracted or imported web content directly while reading in scroll mode, including adding personal notes for future review.

## What Changes
- Show a full markdown editor when scroll mode encounters an extract or imported web article.
- Prefill the editor with the item text and notes, and auto-save edits back to storage.
- Persist edits so they appear the next time the item is opened.

## Impact
- Affected specs: scroll-mode-extract-editing (new)
- Affected code: scroll mode queue rendering (`src/pages/QueueScrollPage.tsx`), extract scroll item UI (`src/components/review/ExtractScrollItem.tsx`), extract/document update APIs
