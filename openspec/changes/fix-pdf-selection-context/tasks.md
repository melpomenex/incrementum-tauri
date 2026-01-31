## 1. Implementation
- [ ] 1.1 Audit current PDF text layer render/selection flow and identify why selections expand to the full page.
- [ ] 1.2 Align PDF text layer sizing/positioning with the canvas viewport across zoom modes and devicePixelRatio.
- [ ] 1.3 Restrict selection handling to PDF text layer ranges and prevent page-wide selection bleed.
- [ ] 1.4 Capture selection context (page number, per-page rects, PDF coords) and pass into extract creation flow.
- [ ] 1.5 Persist selection context on extracts and expose it for deep-linking and image-occlusion use.

## 2. Validation
- [ ] 2.1 Manual QA: select text on PDFs with mixed fonts/columns; verify only highlighted text is selected and visible.
- [ ] 2.2 Manual QA: verify selection accuracy after zoom changes (fit-width, fit-page, custom).
- [ ] 2.3 Manual QA: create extracts from single- and multi-page selections and confirm stored metadata.
- [ ] 2.4 Manual QA: confirm behavior in both web/PWA and Tauri builds.
