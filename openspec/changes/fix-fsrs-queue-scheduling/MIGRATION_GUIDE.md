# FSRS Queue Scheduling - Migration Guide

## Overview

This guide explains the changes made to the queue scheduling system and how to adapt to the new FSRS-based scheduling.

## What Changed?

### Before (Priority-Based Scheduling)
- Documents were ordered primarily by `priority_rating` (1-10) and `priority_slider` (0-100)
- `next_reading_date` was only used as a modifier
- All documents appeared in the queue regardless of due date

### After (FSRS-Based Scheduling)
- Documents are ordered primarily by FSRS `next_reading_date`
- Due documents (`next_reading_date <= now`) appear first
- New documents (never read) appear next
- Future-dated documents are excluded by default
- Your `priority_rating` now acts as a multiplier (0.5x to 2.0x) on FSRS priority

## New Queue Ordering

The queue now follows this order:

1. **Due documents** - Documents with `next_reading_date <= now`
   - Sorted by days overdue (most overdue = slightly lower priority)
   - Within same due date: sorted by stability, then difficulty

2. **New documents** - Documents without `next_reading_date` (never read)
   - Sorted by user-set `priority_rating` (higher rating = higher priority)

3. **Future-dated documents** - Excluded from default queue
   - Only visible in "All Items" view

## User Priority Multiplier

Your `priority_rating` (1-10) now works as a multiplier on FSRS-calculated priority:

| Rating | Multiplier | Effect |
|--------|-----------|---------|
| 1 | 0.5x | Reduces priority by 50% |
| 3 | 0.75x | Reduces priority by 25% |
| 5 | 1.0x | No effect (baseline) |
| 7 | 1.25x | Increases priority by 25% |
| 10 | 2.0x | Doubles priority |

## Queue Filter Modes

The queue page now has four filter modes:

| Mode | Description |
|------|-------------|
| **Due Today** | Documents scheduled for today or overdue (default) |
| **All Items** | All documents in your library |
| **New Only** | Documents that have never been read |
| **Due All** | All due items (documents, extracts, flashcards) |

## Settings

You can enable/disable FSRS scheduling in:

**Settings → Smart Queues → FSRS-Based Queue Scheduling**

- Default: **Enabled**
- Disabling reverts to the old priority-based system
- Changes take effect immediately

## Migration Checklist

### For New Users
- [ ] FSRS scheduling is enabled by default - no action needed
- [ ] Set `priority_rating` on important documents to boost their priority

### For Existing Users
- [ ] Review your current queue order
- [ ] Check if `priority_rating` values are still appropriate for your workflow
- [ ] Consider using "All Items" view if you need to see future-dated documents
- [ ] Adjust `priority_rating` on documents that should appear more/less frequently

## Common Questions

### Q: Why did some documents disappear from my queue?

**A:** Future-dated documents are now excluded from the default queue. Switch to "All Items" view to see them.

### Q: How do I make a document appear sooner?

**A:** Either:
1. Rate the document after reading to update its FSRS schedule
2. Increase its `priority_rating` (up to 10 for 2.0x multiplier)

### Q: Can I still use manual priority curation?

**A:** Yes! Set `priority_rating` values on documents. Documents with rating 5 get 1.0x (no change), rating 10 gets 2.0x (double priority).

### Q: What happens to my existing priority_slider values?

**A:** The `priority_slider` is still available and can be used for fine-tuning, but FSRS `next_reading_date` is now the primary factor.

### Q: How do I revert to the old behavior?

**A:** Go to Settings → Smart Queues and disable "FSRS-Based Queue Scheduling".

## Technical Details

### FSRS Metrics Used
- **Stability** - How long a memory is retained (lower = needs review sooner)
- **Difficulty** - How hard the item is (higher = slightly higher priority)
- **Next Reading Date** - When FSRS calculates the item should be reviewed next

### Database Changes
- Index added on `documents.next_reading_date` for performance
- No schema changes required (migration 014)

## Rollback Strategy

If needed, you can revert to the old system:

1. Go to Settings → Smart Queues
2. Disable "FSRS-Based Queue Scheduling"
3. The queue will revert to priority-based ordering

## Support

For questions or issues:
- Check the GitHub issues page
- Consult the full FSRS documentation at https://github.com/open-spaced-repetition/fsrs4anki
