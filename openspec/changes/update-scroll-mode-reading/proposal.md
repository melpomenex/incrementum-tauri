# Change: Update Scroll Mode Reading Experience

## Why
Scroll Mode misses key reading affordances: the assistant panel is unavailable for document, extract, and RSS items; F11 does not enter fullscreen; and document ratings do not immediately reschedule and advance in the scroll queue. These gaps break expected reading flow.

## What Changes
- Add the assistant panel to Scroll Mode for document, extract, and RSS items (including web documents).
- Make F11 toggle the application fullscreen while in Scroll Mode.
- Ensure rating a document in Scroll Mode reschedules it, removes it from the current scroll list, and advances to the next item.

## Impact
- Affected specs: `specs/document-rating/spec.md`, new Scroll Mode assistant/fullscreen capabilities.
- Affected code: Scroll Mode page, Document/Assistant viewer wrappers, fullscreen handling in scroll context.
