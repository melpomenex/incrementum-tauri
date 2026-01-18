//! Scheduling algorithms implementation
//!
//! This module provides different spaced repetition algorithms:
//! - FSRS-5 (Free Spaced Repetition Scheduler)
//! - SM-2, SM-5, SM-8, SM-15 (SuperMemo algorithms)
//! - Queue selector with weighted randomization
//! - Document scheduler for incremental reading

use crate::models::{LearningItem, ReviewRating};
use chrono::{Utc, Duration};

pub mod optimizer;
pub mod fsrs;
pub mod supermemo;
pub mod queue_selector;
pub mod document_scheduler;
pub mod incremental_scheduler;

// Re-exports
pub use optimizer::calculate_review_statistics;
pub use queue_selector::QueueSelector;
pub use document_scheduler::{DocumentScheduler, DocumentSchedulerParams};
pub use incremental_scheduler::{IncrementalScheduler, IncrementalSchedulerParams};

#[cfg(test)]
mod tests;

/// SM-2 algorithm parameters
#[derive(Debug, Clone)]
pub struct SM2Params {
    /// Ease factor (minimum 1.3)
    pub ease_factor: f64,
    /// Interval in days
    pub interval: f64,
    /// Number of repetitions
    pub repetitions: u32,
}

impl Default for SM2Params {
    fn default() -> Self {
        Self {
            ease_factor: 2.5,
            interval: 0.0,
            repetitions: 0,
        }
    }
}

impl SM2Params {
    /// Calculate next interval using SM-2 algorithm
    pub fn next_interval(&self, rating: ReviewRating) -> Self {
        let _rating_value = rating as i32;

        let mut new_params = self.clone();

        // SM-2 quality mapping: 0-2 = again, 3-4 = hard, 5 = good, 6 = easy
        // Our rating: 1 = again, 2 = hard, 3 = good, 4 = easy
        // Map to SM-2 quality:
        let sm2_quality = match rating {
            ReviewRating::Again => 0,  // Complete failure
            ReviewRating::Hard => 3,   // Hard difficulty
            ReviewRating::Good => 4,   // Good response
            ReviewRating::Easy => 5,   // Perfect response
        };

        // If quality < 3, start over
        if sm2_quality < 3 {
            new_params.repetitions = 0;
            new_params.interval = 0.0;
        } else {
            new_params.repetitions += 1;

            // Calculate interval based on repetition number
            match new_params.repetitions {
                1 => new_params.interval = 1.0,
                2 => new_params.interval = 6.0,
                _ => {
                    // I(n) = I(n-1) * EF
                    new_params.interval *= new_params.ease_factor;
                }
            }

            // Update ease factor
            // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            let q = sm2_quality as f64;
            new_params.ease_factor += 0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02);

            // Ensure ease factor doesn't go below 1.3
            if new_params.ease_factor < 1.3 {
                new_params.ease_factor = 1.3;
            }
        }

        new_params
    }

    /// Calculate next review date
    pub fn next_review_date(&self) -> chrono::DateTime<Utc> {
        let days = self.interval.max(0.0) as i64;
        Utc::now() + Duration::days(days)
    }
}

/// FSRS-5 algorithm wrapper (already implemented in review.rs)
pub struct FsrsScheduler {
    pub desired_retention: f32,
}

impl FsrsScheduler {
    pub fn new(desired_retention: f32) -> Self {
        Self {
            desired_retention,
        }
    }

    /// Calculate next states using FSRS (simplified version)
    pub fn calculate_next_state(
        &self,
        current_stability: f64,
        current_difficulty: f64,
        _elapsed_days: u32,
        rating: ReviewRating,
    ) -> (f64, f64) {
        // This is a simplified version - the actual FSRS is used in submit_review
        // Return (new_stability, new_difficulty)

        let _rating_value = rating as i32;

        // Simplified FSRS-like calculation
        let new_stability = match rating {
            ReviewRating::Again => current_stability * 0.5,
            ReviewRating::Hard => current_stability * 0.8,
            ReviewRating::Good => current_stability * 1.2,
            ReviewRating::Easy => current_stability * 1.5,
        };

        let new_difficulty = match rating {
            ReviewRating::Again => (current_difficulty + 0.2).min(10.0),
            ReviewRating::Hard => (current_difficulty + 0.1).min(10.0),
            ReviewRating::Good => current_difficulty,
            ReviewRating::Easy => (current_difficulty - 0.1).max(1.0),
        };

        (new_stability, new_difficulty)
    }
}

/// Calculate priority score for queue items
pub fn calculate_priority_score(
    due_date: chrono::DateTime<Utc>,
    interval: f64,
    review_count: i32,
    difficulty: f64,
) -> f64 {
    let now = Utc::now();
    let is_due = due_date <= now;
    let days_until_due = (due_date - now).num_days();

    // Base priority from urgency
    let mut priority = if is_due {
        // Items that are due get highest priority
        // New items (interval 0) or low intervals get higher priority
        10.0 - (interval / 10.0)
    } else if days_until_due <= 1 {
        8.0
    } else if days_until_due <= 3 {
        6.0
    } else if days_until_due <= 7 {
        4.0
    } else {
        2.0
    };

    // Adjust for difficulty - harder items get slightly higher priority
    priority += difficulty * 0.1;

    // Adjust for review count - items with few reviews get higher priority
    if review_count < 3 {
        priority += 1.0;
    }

    priority.max(0.0).min(10.0)
}

/// Calculate combined priority score for documents using rating (1-4) and slider (0-100).
pub fn calculate_document_priority_score(
    priority_rating: Option<i32>,
    priority_slider: i32,
) -> f64 {
    let slider = priority_slider.clamp(0, 100) as f64;
    let rating_value = priority_rating.unwrap_or(0);
    let rating_normalized = if (1..=4).contains(&rating_value) {
        (rating_value - 1) as f64 / 3.0 * 100.0
    } else {
        0.0
    };

    ((slider + rating_normalized) / 2.0).max(0.0).min(100.0)
}

/// Calculate FSRS-based priority for documents in the queue.
///
/// This uses FSRS `next_reading_date` as the primary factor, with stability
/// and difficulty as secondary sorting factors. The user's priority_rating
/// acts as a multiplier on the FSRS-calculated priority.
///
/// # Arguments
/// * `next_reading_date` - FSRS-calculated next review date (None for new documents)
/// * `stability` - FSRS stability value (None for new documents)
/// * `difficulty` - FSRS difficulty value (None for new documents)
/// * `priority_rating` - User-set priority (1-10) acting as multiplier
///
/// # Returns
/// A priority score (0-10) where higher values indicate higher urgency
pub fn calculate_fsrs_document_priority(
    next_reading_date: Option<chrono::DateTime<Utc>>,
    stability: Option<f64>,
    difficulty: Option<f64>,
    priority_rating: i32,
) -> f64 {
    let now = Utc::now();

    // Calculate user priority multiplier (0.5x to 2.0x based on rating 1-10)
    // Rating 5 = 1.0x (no effect), Rating 1 = 0.5x, Rating 10 = 2.0x
    let priority_multiplier = if priority_rating > 0 {
        let rating = priority_rating.clamp(1, 10) as f64;
        0.5 + (rating - 1.0) / 9.0 * 1.5  // Maps 1->0.5, 5->1.0, 10->2.0
    } else {
        1.0
    };

    // Base priority from FSRS scheduling
    let base_priority = match next_reading_date {
        Some(next_date) => {
            let is_due = next_date <= now;
            let days_until_due = (next_date - now).num_days();

            if is_due {
                // Overdue documents get highest priority
                // Decay priority based on days overdue (more overdue = slightly lower)
                let days_overdue = -days_until_due;
                (10.0 - (days_overdue as f64 * 0.1)).max(5.0)
            } else {
                // Future-dated documents get lower priority
                // Priority decays the further in the future
                if days_until_due <= 1 {
                    8.0
                } else if days_until_due <= 3 {
                    6.0
                } else if days_until_due <= 7 {
                    4.0
                } else if days_until_due <= 30 {
                    2.0
                } else {
                    0.5  // Very far future, lowest priority
                }
            }
        }
        None => {
            // New documents (never read) get high priority for first reading
            // They're ordered by user-set priority_rating
            9.0
        }
    };

    // Apply user priority multiplier
    let adjusted_priority = base_priority * priority_multiplier;

    // Apply FSRS metrics as micro-adjustments (secondary sorting factors)
    let fsrs_adjustment = match (stability, difficulty) {
        (Some(stab), Some(diff)) => {
            // Lower stability = higher priority (needs more review)
            // Higher difficulty = slightly higher priority (harder items need attention)
            let stability_bonus = if stab < 5.0 { 0.5 } else if stab < 10.0 { 0.2 } else { 0.0 };
            let difficulty_bonus = if diff > 7.0 { 0.3 } else if diff > 5.0 { 0.1 } else { 0.0 };
            stability_bonus + difficulty_bonus
        }
        _ => 0.0
    };

    // Final priority with adjustments, clamped to 0-10 range
    (adjusted_priority + fsrs_adjustment).max(0.0).min(10.0)
}

#[derive(Clone, serde::Serialize)]
pub struct AlgorithmComparison {
    pub algorithm: String,
    pub avg_retention: f64,
    pub total_reviews: i32,
    pub avg_interval: f64,
}

/// Compare algorithm performance
pub fn compare_algorithms(items: &[LearningItem]) -> AlgorithmComparison {
    let total_reviews: i32 = items.iter().map(|i| i.review_count).sum();
    let avg_interval: f64 = if total_reviews > 0 {
        items.iter().map(|i| i.interval).sum::<f64>() / items.len() as f64
    } else {
        0.0
    };

    // Simplified retention estimate (would need historical data for accurate calculation)
    let avg_retention = 0.85; // Placeholder

    AlgorithmComparison {
        algorithm: "FSRS-5".to_string(),
        avg_retention,
        total_reviews,
        avg_interval,
    }
}
