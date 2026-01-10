## 1. Research and framing
- [x] 1.1 Audit existing Documents surfaces and component entry points to unify the redesign target.
- [x] 1.2 Confirm priority signal mapping from existing document fields and define reason heuristics.

## 2. Core UI foundation
- [x] 2.1 Implement mode toggle (grid/list) and persist last-used mode in settings.
- [x] 2.2 Build list/table view with required columns and stable sorting.
- [x] 2.3 Add selection model and right-side inspector panel with required metadata/actions.
- [x] 2.4 Refactor grid cards for progressive disclosure, tag overflow, and progress indicator.

## 3. Search and filtering
- [x] 3.1 Implement tokenized search parser (tag/source/queue/extracts) with graceful fallback.
- [x] 3.2 Wire search filtering to both modes with debounce and basic performance guardrails.

## 4. Workflow power-ups
- [x] 4.1 Add smart sections in grid mode (priority queue, recently imported, active, parked, mostly extracted).
- [x] 4.2 Add saved views and quick switching (if feasible in MVP scope).
- [x] 4.3 Add keyboard shortcuts for search focus, selection nav, open, and inspector toggle.
- [x] 4.4 Add multi-select and bulk actions if UI constraints allow.

## 5. Validation and performance
- [x] 5.1 Add unit tests for search parser and sorting stability.
- [x] 5.2 Add UI tests for mode persistence, inspector selection, and tag overflow.
- [ ] 5.3 Validate performance with 1,000 documents and add virtualization if needed.
