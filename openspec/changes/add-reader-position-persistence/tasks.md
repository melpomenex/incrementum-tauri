## 1. Implementation
- [ ] 1.1 Add ViewState model + storage interface (get/set/clear) with debounce and noise filtering.
- [ ] 1.2 Extend PDF viewer capture to compute anchored dest (XYZ) when PDF.js integration is available.
- [ ] 1.3 Update restore sequence to apply scale/viewMode then position after layout readiness, with verification + single retry.
- [ ] 1.4 Add fallback capture/restore for custom renderers (scrollTop/percent + pageNumber).
- [ ] 1.5 Extend backend progress sync to include ViewState payload while keeping existing fields.
- [ ] 1.6 Add lifecycle persistence hooks (visibilitychange/pagehide/route changes) across reader surfaces.
- [ ] 1.7 Add tests or structured validation for ViewState serialization and restore sequencing.
