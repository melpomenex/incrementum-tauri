# Change: Add item details popover for scheduling transparency

## Why
Users need a lightweight way to inspect item details and scheduling/FSRS data without leaving their current context, especially in Scroll Mode.

## What Changes
- Add a reusable item details popover that surfaces item metadata and scheduling/FSRS information for all queue item types.
- Expose a details trigger in Scroll Mode above each item.
- Expose a details trigger in queue list views to access the same popover content.

## Impact
- Affected specs: `specs/item-detail-popover/spec.md` (new capability)
- Affected code: queue and scroll mode views, shared UI components, scheduling data fetch paths
