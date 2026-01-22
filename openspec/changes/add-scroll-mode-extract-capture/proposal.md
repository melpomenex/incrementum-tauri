# Change: Enable extract capture in scroll mode

## Why
Scroll mode is a primary reading surface, but users cannot create new extracts while reading. This blocks the core capture workflow for PDFs, EPUBs, markdown documents, and HTML/RSS content.

## What Changes
- Allow creating extracts from text selections while in scroll mode for PDF, EPUB, markdown, and HTML/RSS document items.
- Show a confirmation toast after an extract is successfully created.

## Impact
- Affected specs: scroll-mode-extract-capture (new)
- Related changes: add-scroll-mode-extract-editor (editing existing extracts in scroll mode)
- Affected code: scroll mode queue item renderers, extract creation flow, selection handling, toast notifications
