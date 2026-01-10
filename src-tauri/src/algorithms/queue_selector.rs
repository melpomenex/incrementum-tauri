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

    /// Sort queue items by priority (descending) and due date (ascending)
    pub fn sort_queue_items(&self, items: &mut [QueueItem]) {
        items.sort_by(|a, b| {
            // First sort by priority (higher first)
            match b.priority.partial_cmp(&a.priority) {
                Some(std::cmp::Ordering::Equal) => {}
                Some(ord) => return ord,
                None => {}
            }

            // Then sort by due date (earlier first)
            match (&a.due_date, &b.due_date) {
                (Some(a_date), Some(b_date)) => {
                    a_date.partial_cmp(b_date).unwrap_or(std::cmp::Ordering::Equal)
                }
                (Some(_), None) => std::cmp::Ordering::Less,
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
}
