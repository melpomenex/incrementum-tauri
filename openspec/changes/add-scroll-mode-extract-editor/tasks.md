## 1. Implementation
- [x] 1.1 Confirm how scroll mode identifies imported web articles and expose that flag to the scroll item model.
- [x] 1.2 Replace the read-only extract view with a full markdown editor populated from extract content and notes.
- [x] 1.3 Add auto-save with debounce to persist edits to extracts and imported web articles.
- [x] 1.4 Surface save status or error states in scroll mode when persistence fails.
- [x] 1.5 Ensure scroll mode navigation and rating still work with the editor focused.

## 2. Validation
- [ ] 2.1 Open scroll mode on an extract; confirm editor shows existing content and notes, edits auto-save, and re-open reflects changes.
- [ ] 2.2 Open scroll mode on a web article imported via extension; confirm editor shows article text, edits auto-save, and re-open reflects changes.
- [ ] 2.3 Verify rating and queue navigation still advance correctly after editing.
