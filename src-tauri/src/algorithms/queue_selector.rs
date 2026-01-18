//! Queue selector implementation
//!
//! This module provides intelligent queue selection with weighted randomization,
//! similar to the Incrementum-CPP QueueSelector implementation.

use crate::models::queue::QueueItem;
use rand::{distributions::WeightedIndex, prelude::*, rngs::StdRng};
use rand::SeedableRng;

/// Queue selector with weighted randomization
pub struct QueueSelector {
    /// Randomness factor (0.0 = always pick first, 1.0 = full random)
    randomness: f32,
    /// Seed for reproducible selection
    seed: Option<u64>,
}

impl QueueSelector {
    /// Create a new queue selector
    pub fn new(randomness: f32) -> Self {
        Self {
            randomness: randomness.clamp(0.0, 1.0),
            seed: None,
        }
    }

    /// Create with a specific seed for reproducibility
    pub fn with_seed(randomness: f32, seed: u64) -> Self {
        Self {
            randomness: randomness.clamp(0.0, 1.0),
            seed: Some(seed),
        }
    }

    /// Get the next item from the queue using weighted randomization
    pub fn get_next_item<'a>(&self, items: &'a [QueueItem]) -> Option<&'a QueueItem> {
        if items.is_empty() {
            return None;
        }

        // If randomness is very low, always return the first item
        if self.randomness <= 0.05 {
            return items.first();
        }

        // Calculate window size based on randomness
        let window_size = ((items.len() as f32) * self.randomness).ceil() as usize;
        let window_size = window_size.clamp(1, items.len());
        let window = &items[..window_size];

        // Use weighted index selection
        let index = self.pick_weighted_index(window_size);

        window.get(index).or_else(|| items.first())
    }

    /// Get multiple items from the queue
    pub fn get_next_items<'a>(&self, items: &'a [QueueItem], count: usize) -> Vec<&'a QueueItem> {
        if items.is_empty() || count == 0 {
            return Vec::new();
        }

        let count = count.min(items.len());
        let mut result = Vec::new();
        let mut seen_ids = Vec::new();

        for item in items.iter() {
            if result.len() >= count {
                break;
            }

            if seen_ids.contains(&item.id) {
                continue;
            }

            seen_ids.push(item.id.clone());
            result.push(item);
        }

        result
    }

    /// Pick a weighted index from the queue window
    ///
    /// This implements the decay-based weighting from the C++ version,
    /// where items at the top of the queue have higher weights.
    fn pick_weighted_index(&self, window_size: usize) -> usize {
        if window_size == 0 {
            return 0;
        }

        // Calculate weights with exponential decay
        // Higher decay = more bias toward top items
        let decay = 0.55 + (1.0 - self.randomness) * 0.35;
        let weights: Vec<f64> = (0..window_size)
            .map(|i| decay.powi(i as i32) as f64)
            .collect();

        // Create weighted distribution
        let dist = WeightedIndex::new(&weights).unwrap_or_else(|_| {
            // Fallback to uniform distribution if weights are invalid
            WeightedIndex::new(vec![1.0; window_size]).unwrap()
        });

        // Use either seeded RNG or thread RNG
        let mut rng = if let Some(seed) = self.seed {
            StdRng::seed_from_u64(seed)
        } else {
            StdRng::from_entropy()
        };

        dist.sample(&mut rng)
    }

    /// Sort queue items using FSRS-based priority
    ///
    /// Sorting order (FSRS-first):
    /// 1. Due items (next_reading_date <= now) appear before future-dated items
    /// 2. Items are sorted by FSRS-calculated priority (descending)
    /// 3. Within same priority, items are sorted by due date (ascending)
    /// 4. New items (no due_date) are ordered by user-set priority_rating
    pub fn sort_queue_items(&self, items: &mut [QueueItem]) {
        let now = chrono::Utc::now();

        items.sort_by(|a, b| {
            // Determine if each item is due, new, or future-dated
            let a_is_due = a.due_date.as_ref()
                .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                .map(|d| d.with_timezone(&chrono::Utc) <= now)
                .unwrap_or(false); // No due_date = new item
            let a_is_new = a.due_date.is_none();
            let b_is_due = b.due_date.as_ref()
                .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                .map(|d| d.with_timezone(&chrono::Utc) <= now)
                .unwrap_or(false);
            let b_is_new = b.due_date.is_none();

            // Primary sort: Due items first, then new items, then future-dated items
            match (a_is_due, a_is_new, b_is_due, b_is_new) {
                (true, _, false, false) => return std::cmp::Ordering::Less,  // a is due, b is future
                (false, false, true, _) => return std::cmp::Ordering::Greater, // a is future, b is due
                (false, true, false, false) => return std::cmp::Ordering::Less,  // a is new, b is future
                (false, false, false, true) => return std::cmp::Ordering::Greater, // a is future, b is new
                _ => {} // Both are due, both are new, or both are future - continue to secondary sort
            }

            // Secondary sort: by FSRS-calculated priority (higher first)
            match b.priority.partial_cmp(&a.priority) {
                Some(std::cmp::Ordering::Equal) => {}
                Some(ord) => return ord,
                None => {}
            }

            // Tertiary sort: by due date (earlier first) for items with due dates
            match (&a.due_date, &b.due_date) {
                (Some(a_date), Some(b_date)) => {
                    a_date.partial_cmp(b_date).unwrap_or(std::cmp::Ordering::Equal)
                }
                (Some(_), None) => std::cmp::Ordering::Less,  // Has due date comes before new items
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
        });
    }

    /// Filter queue items to only those that are due
    pub fn filter_due_items<'a>(&self, items: &'a [QueueItem]) -> Vec<&'a QueueItem> {
        let now = chrono::Utc::now();
        items
            .iter()
            .filter(|item| {
                if let Some(due_date_str) = &item.due_date {
                    if let Ok(due_date) = chrono::DateTime::parse_from_rfc3339(due_date_str) {
                        return due_date.with_timezone(&chrono::Utc) <= now;
                    }
                }
                // Items without due dates are considered due
                true
            })
            .collect()
    }

    /// Get items that should be in the reading queue
    /// This includes due items and unscheduled documents
    pub fn get_queued_items<'a>(&self, items: &'a [QueueItem]) -> Vec<&'a QueueItem> {
        items
            .iter()
            .filter(|item| {
                // Include learning items that are due
                if item.item_type == "learning-item" {
                    if let Some(due_date_str) = &item.due_date {
                        if let Ok(due_date) = chrono::DateTime::parse_from_rfc3339(due_date_str) {
                            return due_date.with_timezone(&chrono::Utc) <= chrono::Utc::now();
                        }
                    }
                    return true;
                }

                // Include documents (for incremental reading)
                if item.item_type == "document" {
                    // Include documents that aren't archived
                    return true;
                }

                false
            })
            .collect()
    }
}

impl Default for QueueSelector {
    fn default() -> Self {
        Self::new(0.3) // Default 30% randomness
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_test_item(id: &str, priority: f64, due_days: i64) -> QueueItem {
        let due_date = if due_days >= 0 {
            Some((Utc::now() + chrono::Duration::days(due_days)).to_rfc3339())
        } else {
            None
        };

        QueueItem {
            id: id.to_string(),
            document_id: "doc1".to_string(),
            document_title: "Test Document".to_string(),
            extract_id: None,
            learning_item_id: Some(id.to_string()),
            item_type: "learning-item".to_string(),
            priority_rating: None,
            priority_slider: None,
            priority,
            due_date,
            estimated_time: 5,
            tags: vec![],
            category: None,
            progress: 0,
        }
    }

    #[test]
    fn test_queue_selector_no_randomness() {
        let selector = QueueSelector::new(0.0);
        let items = vec![
            create_test_item("1", 10.0, 0),
            create_test_item("2", 9.0, 0),
            create_test_item("3", 8.0, 0),
        ];

        // With no randomness, should always pick the first item
        let selected = selector.get_next_item(&items);
        assert_eq!(selected.unwrap().id, "1");
    }

    #[test]
    fn test_queue_selector_sorting() {
        let selector = QueueSelector::new(0.3);
        let mut items = vec![
            create_test_item("1", 5.0, 5),
            create_test_item("2", 10.0, 0),
            create_test_item("3", 8.0, -1),
            create_test_item("4", 10.0, 2),
        ];

        selector.sort_queue_items(&mut items);

        // Should be sorted by priority (desc), then due date (asc)
        assert_eq!(items[0].id, "2"); // Priority 10, due 0 days
        assert_eq!(items[1].id, "4"); // Priority 10, due 2 days
        assert_eq!(items[2].id, "3"); // Priority 8
        assert_eq!(items[3].id, "1"); // Priority 5
    }

    #[test]
    fn test_filter_due_items() {
        let selector = QueueSelector::new(0.3);
        let items = vec![
            create_test_item("1", 10.0, -1), // Past due
            create_test_item("2", 9.0, 0),   // Due today
            create_test_item("3", 8.0, 5),   // Due in 5 days
        ];

        let due_items = selector.filter_due_items(&items);
        assert_eq!(due_items.len(), 2);
        assert!(due_items.iter().any(|i| i.id == "1"));
        assert!(due_items.iter().any(|i| i.id == "2"));
    }

    // FSRS-based queue ordering tests

    #[test]
    fn test_fsrs_queue_sorting_due_items_first() {
        let selector = QueueSelector::new(0.0);
        let mut items = vec![
            // New item (no due date) - should come after due items
            create_test_item("new", 9.0, -1),
            // Future-dated item - should come last
            create_test_item("future", 5.0, 10),
            // Due items - should come first
            create_test_item("due1", 8.0, 0),
            create_test_item("due2", 7.0, -2), // Overdue
        ];

        selector.sort_queue_items(&mut items);

        // Order should be: due items first (by priority), then new, then future
        assert_eq!(items[0].id, "due1");  // Due, priority 8
        assert_eq!(items[1].id, "due2");  // Due, priority 7
        assert_eq!(items[2].id, "new");   // New (no due date)
        assert_eq!(items[3].id, "future"); // Future-dated
    }

    #[test]
    fn test_fsrs_queue_sorting_new_vs_future() {
        let selector = QueueSelector::new(0.0);
        let mut items = vec![
            create_test_item("future1", 9.0, 30),  // Far future
            create_test_item("new1", 5.0, -1),     // New item
            create_test_item("future2", 8.0, 5),   // Near future
            create_test_item("new2", 7.0, -1),     // New item
        ];

        selector.sort_queue_items(&mut items);

        // New items should come before future-dated items
        assert!(items.iter().position(|i| i.id == "new1").unwrap() <
                items.iter().position(|i| i.id == "future1").unwrap());
        assert!(items.iter().position(|i| i.id == "new2").unwrap() <
                items.iter().position(|i| i.id == "future2").unwrap());
    }

    #[test]
    fn test_fsrs_queue_sorting_due_date_secondary() {
        let selector = QueueSelector::new(0.0);
        let now = Utc::now();

        let mut items = vec![
            QueueItem {
                id: "due_today".to_string(),
                document_id: "doc1".to_string(),
                document_title: "Due Today".to_string(),
                extract_id: None,
                learning_item_id: None,
                item_type: "document".to_string(),
                priority_rating: None,
                priority_slider: None,
                priority: 9.0,
                due_date: Some(now.to_rfc3339()),
                estimated_time: 5,
                tags: vec![],
                category: None,
                progress: 0,
            },
            QueueItem {
                id: "due_tomorrow".to_string(),
                document_id: "doc2".to_string(),
                document_title: "Due Tomorrow".to_string(),
                extract_id: None,
                learning_item_id: None,
                item_type: "document".to_string(),
                priority_rating: None,
                priority_slider: None,
                priority: 9.0, // Same priority
                due_date: Some((now + chrono::Duration::days(1)).to_rfc3339()),
                estimated_time: 5,
                tags: vec![],
                category: None,
                progress: 0,
            },
        ];

        selector.sort_queue_items(&mut items);

        // Due today should come before due tomorrow (same priority)
        assert_eq!(items[0].id, "due_today");
        assert_eq!(items[1].id, "due_tomorrow");
    }

    #[test]
    fn test_fsrs_queue_new_items_ordered_by_priority() {
        let selector = QueueSelector::new(0.0);
        let mut items = vec![
            create_test_item("new_low", 5.0, -1),
            create_test_item("new_high", 9.0, -1),
            create_test_item("new_med", 7.0, -1),
        ];

        selector.sort_queue_items(&mut items);

        // New items should be ordered by priority (descending)
        assert_eq!(items[0].id, "new_high"); // Priority 9
        assert_eq!(items[1].id, "new_med");  // Priority 7
        assert_eq!(items[2].id, "new_low");  // Priority 5
    }
}
