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

// Re-exports
pub use fsrs::{FSRSParams, FSRSScheduler, FSRSState};
pub use supermemo::{SM2Algorithm, SM2State, SM5Algorithm, SM5State, SM8Algorithm, SM8State, SM15Algorithm, SM15State};
pub use optimizer::calculate_review_statistics;
pub use queue_selector::QueueSelector;
pub use document_scheduler::{DocumentScheduler, DocumentSchedulerParams, DocumentScheduleResult};

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
        let rating_value = rating as i32;

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
                    new_params.interval = new_params.interval * new_params.ease_factor;
                }
            }

            // Update ease factor
            // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            let q = sm2_quality as f64;
            new_params.ease_factor = new_params.ease_factor + (0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02));

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
        elapsed_days: u32,
        rating: ReviewRating,
    ) -> (f64, f64) {
        // This is a simplified version - the actual FSRS is used in submit_review
        // Return (new_stability, new_difficulty)

        let rating_value = rating as i32;

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
///
/// DEPRECATED: Use `calculate_fsrs_document_priority` instead for FSRS-first scheduling.
/// This function is kept for backward compatibility.
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

/// Calculate FSRS-first document priority score.
///
/// This function prioritizes FSRS scheduling over manual priority settings,
/// ensuring that documents are scheduled based on memory retention algorithms.
///
/// # Priority Calculation
///
/// 1. **Base Priority (0-10)** - Calculated from FSRS due date:
///    - Overdue: 10.0 - (days_overdue / 30) * 3  (decreases as it gets more overdue)
///    - Due today: 9.0
///    - Due in 1 day: 7.0
///    - Due in 3 days: 5.0
///    - Due in 7 days: 3.0
///    - Due later: max(1.0, 10 - days_until_due / 10)
///
/// 2. **FSRS Adjustments**:
///    - Difficulty: +difficulty * 0.1 (harder items get higher priority)
///    - Stability: Lower stability = higher urgency for review
///    - New items (stability ~0): Get boosted priority
///
/// 3. **Manual Priority Modifier**:
///    - Acts as a multiplier: base_priority * (0.5 to 1.5)
///    - Calculated from: 1.0 + (priority_slider - 50) / 100
///    - This allows users to boost/reduce priority without overriding FSRS
///
/// # Arguments
///
/// * `next_reading_date` - FSRS-calculated next reading date (required for FSRS scheduling)
/// * `stability` - FSRS stability value (how long memory lasts, in days)
/// * `difficulty` - FSRS difficulty value (1-10 scale)
/// * `reps` - Number of times the document has been reviewed
/// * `priority_slider` - User-set priority slider (0-100, default 50 = neutral)
///
pub fn calculate_fsrs_document_priority(
    next_reading_date: chrono::DateTime<Utc>,
    stability: f64,
    difficulty: f64,
    reps: i32,
    priority_slider: i32,
) -> f64 {
    let now = Utc::now();
    let is_due = next_reading_date <= now;
    let days_diff = (next_reading_date - now).num_days();

    // Base priority from FSRS due date
    let mut base_priority = if is_due {
        // Overdue items - priority decreases as items get MORE overdue
        // This prevents ancient overdue items from clogging the queue
        let days_overdue = -days_diff;
        let overdue_penalty = (days_overdue as f64 / 30.0) * 3.0;
        (10.0 - overdue_penalty).max(6.0) // Floor at 6.0 for overdue items
    } else if days_diff <= 0 {
        9.0  // Due today
    } else if days_diff <= 1 {
        7.0  // Due tomorrow
    } else if days_diff <= 3 {
        5.0  // Due in 2-3 days
    } else if days_diff <= 7 {
        3.0  // Due this week
    } else {
        // Due later - gradually decrease priority
        (10.0 - (days_diff as f64 / 10.0)).max(1.0)
    };

    // FSRS Adjustments

    // 1. Difficulty adjustment - harder items get slightly higher priority
    base_priority += difficulty * 0.1;

    // 2. Stability adjustment - items with low stability need more frequent review
    // Stability < 1 day = very unstable, needs immediate review
    // Stability > 30 days = very stable, less urgent
    let stability_bonus = if stability < 1.0 {
        1.0  // Very unstable, boost priority
    } else if stability < 7.0 {
        0.5  // Somewhat unstable
    } else if stability > 30.0 {
        -0.5  // Very stable, reduce priority slightly
    } else {
        0.0  // Normal stability
    };
    base_priority += stability_bonus;

    // 3. New item boost - items with few repetitions get higher priority
    // This ensures new documents get reviewed quickly to establish stability
    if reps == 0 {
        base_priority += 2.0;  // Never reviewed - high priority
    } else if reps < 3 {
        base_priority += 1.0;  // Still learning - medium boost
    }

    // Clamp base priority to 0-10 range before applying user modifier
    base_priority = base_priority.max(0.0).min(10.0);

    // Manual Priority Modifier (0.5x to 1.5x)
    // slider = 0   -> 0.5x multiplier (reduce priority by half)
    // slider = 50  -> 1.0x multiplier (neutral, FSRS only)
    // slider = 100 -> 1.5x multiplier (boost priority by 50%)
    let slider_normalized = priority_slider.clamp(0, 100) as f64;
    let priority_multiplier = 1.0 + (slider_normalized - 50.0) / 100.0;

    let final_priority = base_priority * priority_multiplier;

    // Final clamp to 0-10 range
    final_priority.max(0.0).min(10.0)
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
        items.iter().map(|i| i.interval as f64).sum::<f64>() / items.len() as f64
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
