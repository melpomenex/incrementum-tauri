## 1. EPUB Reader Fixes
- [x] 1.1 Adjust EPUB rendition/container to support continuous scrolled flow across sections
- [x] 1.2 Normalize TOC hrefs and navigation logic; add regression guard logs/tests if needed
- [ ] 1.3 Manual QA: open EPUB, verify full scroll and TOC navigation for multiple items

## 2. PDF Progress Restore
- [x] 2.1 Persist PDF progress on tab visibility change and unmount in web app
- [x] 2.2 Restore PDF page + scroll from most-recent source; avoid auto-scroll conflicts
- [ ] 2.3 Manual QA: switch tabs, reopen document, and restart app; confirm resume
