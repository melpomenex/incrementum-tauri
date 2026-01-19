## 1. Discovery & Alignment
- [ ] 1.1 Review `openspec/changes/add-user-profile-and-auth` and `add-auth-ui` for overlap; record dependencies and required extensions.
- [ ] 1.2 Inspect current queue/review stores to identify where session state is reset and where FSRS order is applied.

## 2. Data Model & Sync
- [ ] 2.1 Define collection schema and add `collection_id` to documents, extracts, learning items, and queue items.
- [ ] 2.2 Add server API endpoints for collection CRUD and active collection selection.
- [ ] 2.3 Add progress sync fields/endpoints for PDF reading state with timestamp conflict resolution.

## 3. Reading Progress & Assistant Context
- [ ] 3.1 Implement PDF text extraction cache and sliding window assembly in the viewer layer.
- [ ] 3.2 Wire Assistant context to use the PDF text window, selection priority, and token limit.
- [ ] 3.3 Add optional OCR preference usage when OCR text is available.

## 4. Extract → Learning Flow
- [ ] 4.1 Ensure selection-based extract dialog works in PDFs and exposes Extract / Cloze / Q&A actions.
- [ ] 4.2 Confirm created learning items are inserted into FSRS scheduling and queue views.

## 5. FSRS Queue Continuity
- [ ] 5.1 Persist review session state per user + collection and restore on resume.
- [ ] 5.2 Ensure rated items are excluded on resume and due ordering follows FSRS.

## 6. Knowledge Graph
- [ ] 6.1 Replace Knowledge Network placeholder with the real Knowledge Graph view.
- [ ] 6.2 Add collection scoping, filters, and click-to-open navigation.

## 7. Toolbar Navigation
- [ ] 7.1 Implement Read Next using FSRS due ordering within the active collection and current filter.
- [ ] 7.2 Implement Random Item using the same scoping and item-type routing.

## 8. Validation
- [ ] 8.1 Add/extend tests for queue ordering, session resume, and progress sync conflict resolution.
- [ ] 8.2 Manual QA: PDF resume across devices, assistant context window, extract → cloze/Q&A flow, graph navigation, toolbar actions.
