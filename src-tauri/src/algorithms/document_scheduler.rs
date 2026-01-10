//! Document scheduler implementation
//!
//! This module provides document scheduling for incremental reading,
//! ported from the Incrementum-CPP DocumentScheduler implementation.

use crate::algorithms::fsrs::{FSRSScheduler, FSRSState};
use crate::models::ReviewRating;
use chrono::{Utc, Duration};
use serde::{Deserialize, Serialize};

/// Document scheduler parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSchedulerParams {
    /// Minimum interval in days
    pub min_interval_days: i64,
    /// Maximum interval in days
    pub max_interval_days: i64,
    /// Interval modifier (multiplier)
    pub interval_modifier: f64,
    /// Target retention rate
    pub target_retention: f64,
    /// Base ease factor
    pub ease_factor: f64,
    /// Graduating interval in days
    pub graduating_interval: i64,
    /// Easy interval in days
    pub easy_interval: i64,
    /// Ease bonus
    pub ease_bonus: f64,
    /// Hard interval in days
    pub hard_interval: i64,
}

impl Default for DocumentSchedulerParams {
    fn default() -> Self {
        Self {
            min_interval_days: 1,
            max_interval_days: 3650, // 10 years
            interval_modifier: 1.0,
            target_retention: 0.9,
            ease_factor: 2.5,
            graduating_interval: 3,
            easy_interval: 4,
            ease_bonus: 1.3,
            hard_interval: 1,
        }
    }
}

/// Document scheduling result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentScheduleResult {
    /// Next review date
    pub next_review: chrono::DateTime<Utc>,
    /// Stability (how long memory lasts, in days)
    pub stability: f64,
    /// Difficulty (1-10 scale)
    pub difficulty: f64,
    /// Applied priority (0-100)
    pub priority_applied: i32,
    /// Interval in days
    pub interval_days: i64,
    /// Scheduling reason/explanation
    pub scheduling_reason: String,
}

/// Document scheduler for incremental reading
pub struct DocumentScheduler {
    params: DocumentSchedulerParams,
    fsrs_scheduler: FSRSScheduler,
}

impl DocumentScheduler {
    /// Create a new document scheduler
    pub fn new(params: DocumentSchedulerParams) -> Self {
        let fsrs_scheduler = FSRSScheduler::default_params();
        Self {
            params,
            fsrs_scheduler,
        }
    }

    /// Create with default parameters
    pub fn default_params() -> Self {
        Self::new(DocumentSchedulerParams::default())
    }

    /// Schedule a document based on rating (1-5 scale)
    ///
    /// # Arguments
    /// * `rating` - User rating from 1 (poor) to 5 (excellent)
    /// * `reading_count` - Number of times the document has been read
    /// * `current_stability` - Current stability in days (None for new documents)
    /// * `current_difficulty` - Current difficulty (None for new documents)
    /// * `priority` - Document priority (0-100)
    pub fn schedule_document(
        &self,
        rating: i32,
        reading_count: i32,
        current_stability: Option<f64>,
        current_difficulty: Option<f64>,
        priority: i32,
    ) -> DocumentScheduleResult {
        let clamped_rating = rating.clamp(1, 5);
        let review_count = reading_count.max(1);

        // Get current stability and difficulty with defaults
        let base_stability = current_stability.unwrap_or(2.5 + review_count as f64 * 0.35);
        let base_difficulty = current_difficulty.unwrap_or(2.5);
        let normalized_priority = (priority.clamp(0, 100) as f64) / 100.0;

        // Calculate rating bias (higher rating = shorter interval for more frequent review)
        let rating_bias = 0.6 + (5 - clamped_rating) as f64 * 0.35;
        let priority_weight = 0.7 + (1.0 - normalized_priority) * 0.8;
        let difficulty_factor = (3.0 - (base_difficulty * 0.35)).clamp(0.5, 1.6);

        // Calculate stability growth
        let mut stability_growth = base_stability * (1.05 + clamped_rating as f64 * 0.12);
        stability_growth += review_count as f64 * 0.35;
        stability_growth = stability_growth
            .clamp(1.0, self.params.max_interval_days as f64);

        // Calculate interval
        let mut interval_days = (stability_growth * rating_bias * priority_weight * difficulty_factor).round() as i64;
        interval_days = (interval_days as f64 * self.params.interval_modifier).round() as i64;
        interval_days = interval_days.clamp(
            self.params.min_interval_days,
            self.params.max_interval_days,
        );

        // Calculate next difficulty
        let next_difficulty = (base_difficulty + (3 - clamped_rating) as f64 * 0.08).clamp(1.0, 4.0);

        // Calculate priority to apply
        let priority_applied = (clamped_rating * 20).clamp(10, 100);

        let next_review = Utc::now() + Duration::days(interval_days);

        DocumentScheduleResult {
            next_review,
            stability: stability_growth,
            difficulty: next_difficulty,
            priority_applied,
            interval_days,
            scheduling_reason: format!(
                "Rating: {}, Reading count: {}, Priority weight: {:.2}, Difficulty: {:.2}",
                clamped_rating, review_count, priority_weight, next_difficulty
            ),
        }
    }

    /// Schedule a document using FSRS algorithm
    ///
    /// # Arguments
    /// * `rating` - FSRS rating (Again=1, Hard=2, Good=3, Easy=4)
    /// * `current_stability` - Current stability in days
    /// * `current_difficulty` - Current difficulty
    /// * `elapsed_days` - Days since last review
    pub fn schedule_document_fsrs(
        &self,
        rating: ReviewRating,
        current_stability: f64,
        current_difficulty: f64,
        elapsed_days: f64,
    ) -> DocumentScheduleResult {
        let fsrs_state = FSRSState {
            stability: current_stability,
            difficulty: current_difficulty,
        };

        // Get next state from FSRS
        let next_state = self.fsrs_scheduler.next_state(&fsrs_state, rating, elapsed_days);

        // Calculate interval from stability
        let interval_days = self
            .fsrs_scheduler
            .next_interval(&next_state)
            .max(self.params.min_interval_days as i32) as i64;

        let next_review = Utc::now() + Duration::days(interval_days);

        DocumentScheduleResult {
            next_review,
            stability: next_state.stability,
            difficulty: next_state.difficulty,
            priority_applied: 50, // Default priority
            interval_days,
            scheduling_reason: format!(
                "FSRS v5 - Rating: {:?}, Stability: {:.2}, Difficulty: {:.2}",
                rating, next_state.stability, next_state.difficulty
            ),
        }
    }

    /// Get the scheduler parameters
    pub fn params(&self) -> &DocumentSchedulerParams {
        &self.params
    }

    /// Update the scheduler parameters
    pub fn update_params(&mut self, params: DocumentSchedulerParams) {
        self.params = params;
    }

    /// Get the FSRS scheduler
    pub fn fsrs_scheduler(&self) -> &FSRSScheduler {
        &self.fsrs_scheduler
    }
}

impl Default for DocumentScheduler {
    fn default() -> Self {
        Self::default_params()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_scheduling_new_document() {
        let scheduler = DocumentScheduler::default_params();

        // Schedule a new document with a good rating
        let result = scheduler.schedule_document(4, 0, None, None, 50);

        assert!(result.interval_days >= 1);
        assert!(result.stability > 0.0);
        assert!(result.difficulty > 0.0);
        assert!(result.next_review > Utc::now());
    }

    #[test]
    fn test_document_scheduling_with_existing_stability() {
        let scheduler = DocumentScheduler::default_params();

        // Schedule a document that has been read before
        let result = scheduler.schedule_document(3, 5, Some(10.0), Some(3.0), 70);

        assert!(result.interval_days >= 1);
        assert!(result.stability >= 10.0); // Should grow or stay similar
    }

    #[test]
    fn test_document_scheduling_fsrs() {
        let scheduler = DocumentScheduler::default_params();

        let result = scheduler.schedule_document_fsrs(ReviewRating::Good, 5.0, 3.0, 2.0);

        assert!(result.interval_days >= 1);
        assert!(result.next_review > Utc::now());
    }

    #[test]
    fn test_document_scheduling_high_priority() {
        let scheduler = DocumentScheduler::default_params();

        // High priority should result in shorter intervals
        let high_priority = scheduler.schedule_document(3, 1, None, None, 90);
        let low_priority = scheduler.schedule_document(3, 1, None, None, 10);

        assert!(high_priority.interval_days <= low_priority.interval_days);
    }

    #[test]
    fn test_document_scheduling_rating_effect() {
        let scheduler = DocumentScheduler::default_params();

        // Higher rating should result in longer intervals
        let good_rating = scheduler.schedule_document(4, 1, None, None, 50);
        let poor_rating = scheduler.schedule_document(2, 1, None, None, 50);

        // Poor rating should give shorter interval (reviewed sooner)
        assert!(poor_rating.interval_days < good_rating.interval_days);
    }
}
