# Change: Redesign documents view for incremental reading workflow

## Why
The current documents grid is hard to scan at scale and does not foreground the next-best-action workflow of incremental reading. Users need a faster way to identify priority items and act without leaving the page.

## What Changes
- Add dual-mode layout (grid for browsing, list/table for work) with persisted mode.
- Introduce visible priority signals and derived priority reasons per document.
- Add a right-side inspector panel for full metadata and actions.
- Implement progressive disclosure for metadata and tags in listings.
- Add power-user search with token parsing and list sorting.
- Add grid smart sections based on document state/metadata.
- Add (non-blocking) enhancements: saved views, keyboard shortcuts, bulk actions, optional next-action column.

## Impact
- Affected specs: documents-view (new)
- Affected code: Documents view UI, document list/grid components, search/filter logic, settings persistence, and inspector panel.
