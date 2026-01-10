# Tasks: Review Document Reading

- [x] Update `src-tauri/src/commands/algorithm.rs` to implement `rate_document` with persistence and `time_taken`. <!-- id: 0 -->
- [x] Add `update_document_scheduling` method to `Repository` if not present (or verify `update_document` works). <!-- id: 1 -->
- [x] Update `src/api/algorithm.ts` to include `rateDocument` with `time_taken`. <!-- id: 2 -->
- [x] Update `src/components/viewer/DocumentViewer.tsx` to track time and call `rateDocument`. <!-- id: 3 -->
- [x] Update `src/components/viewer/DocumentViewer.tsx` to handle navigation after rating. <!-- id: 4 -->
- [x] Verify `useQueueNavigation` works as expected with the new workflow. <!-- id: 5 -->