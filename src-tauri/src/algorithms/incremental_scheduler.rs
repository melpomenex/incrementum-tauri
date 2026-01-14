//! Incremental Reading Scheduler
//!
//! This scheduler is designed specifically for incremental reading and video watching.
//! Unlike FSRS which is optimized for long-term flashcard retention, this scheduler:
//! - Uses shorter, more predictable intervals
//! - Prevents intervals from growing too large with repeated "Hard" ratings
//! - Is tunable for different user preferences
//! - Keeps content in rotation for better engagement

use crate::models::ReviewRating;
use chrono::{Utc, Duration};
use serde::{Deserialize, Serialize};

/// Parameters for incremental reading scheduler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncrementalSchedulerParams {
    /// Interval (in days) for "Again" rating - user wants to see it again soon
    pub again_interval_hours: i64,

    /// Interval (in days) for "Hard" rating - user found it difficult
    pub hard_interval_days: i64,

    /// Interval (in days) for "Good" rating - normal review
    pub good_interval_days: i64,

    /// Interval (in days) for "Easy" rating - user found it easy
    pub easy_interval_days: i64,

    /// Maximum interval cap (in days) - prevents reviews from stretching too long
    pub max_interval_days: i64,

    /// Bonus multiplier for consecutive good/easy ratings (0.0 = disabled)
    /// Example: 0.5 means each consecutive good rating adds 50% more interval
    pub consecutive_bonus_multiplier: f64,

    /// Penaly multiplier for consecutive again/hard ratings (0.0 = disabled)
    /// Example: 0.3 means each consecutive again/hard reduces interval by 30%
    pub consecutive_penalty_multiplier: f64,
}

impl Default for IncrementalSchedulerParams {
    fn default() -> Self {
        Self {
            // Sensible defaults for incremental reading:
            // - Again: 4 hours (user wants to see it again today)
            again_interval_hours: 4,

            // - Hard: 1 day (review tomorrow)
            hard_interval_days: 1,

            // - Good: 3 days (review in a few days)
            good_interval_days: 3,

            // - Easy: 7 days (review in a week)
            easy_interval_days: 7,

            // - Max: 30 days (keep content in rotation monthly at most)
            max_interval_days: 30,

            // - Consecutive bonus: 20% per consecutive good rating
            consecutive_bonus_multiplier: 0.2,

            // - Consecutive penalty: 15% per consecutive again/hard rating
            consecutive_penalty_multiplier: 0.15,
        }
    }
}

/// Scheduling result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncrementalScheduleResult {
    /// Next review date
    pub next_review: chrono::DateTime<Utc>,
    /// Stability (for compatibility with FSRS fields)
    pub stability: f64,
    /// Difficulty (for compatibility with FSRS fields)
    pub difficulty: f64,
    /// Interval in days
    pub interval_days: i64,
    /// Scheduling reason/explanation
    pub scheduling_reason: String,
    /// Consecutive count (for tracking)
    pub consecutive_count: i32,
}

/// Incremental reading scheduler
///
/// This scheduler is optimized for incremental reading and video watching,
/// where the goal is to keep content in regular rotation rather than
/// maximizing long-term retention.
pub struct IncrementalScheduler {
    params: IncrementalSchedulerParams,
}

impl IncrementalScheduler {
    /// Create a new incremental scheduler
    pub fn new(params: IncrementalSchedulerParams) -> Self {
        Self { params }
    }

    /// Create with default parameters
    pub fn default_params() -> Self {
        Self::new(IncrementalSchedulerParams::default())
    }

    /// Schedule a document/video based on rating and history
    ///
    /// # Arguments
    /// * `rating` - FSRS rating (Again=1, Hard=2, Good=3, Easy=4)
    /// * `current_interval_days` - Current interval in days (reserved for future enhancements)
    /// * `consecutive_good_count` - Number of consecutive good/easy ratings
    /// * `consecutive_hard_count` - Number of consecutive again/hard ratings
    pub fn schedule_item(
        &self,
        rating: ReviewRating,
        _current_interval_days: Option<i64>,
        consecutive_good_count: i32,
        consecutive_hard_count: i32,
    ) -> IncrementalScheduleResult {
        // Determine base interval from rating
        let (base_interval_days, rating_name) = match rating {
            ReviewRating::Again => (
                // Convert hours to days (use as fraction of day)
                self.params.again_interval_hours as f64 / 24.0,
                "Again"
            ),
            ReviewRating::Hard => (
                self.params.hard_interval_days as f64,
                "Hard"
            ),
            ReviewRating::Good => (
                self.params.good_interval_days as f64,
                "Good"
            ),
            ReviewRating::Easy => (
                self.params.easy_interval_days as f64,
                "Easy"
            ),
        };

        // Calculate interval with modifiers
        let mut interval_days = base_interval_days;

        // Apply consecutive bonus for good/easy ratings
        if matches!(rating, ReviewRating::Good | ReviewRating::Easy) && consecutive_good_count > 0 {
            let bonus = 1.0 + (self.params.consecutive_bonus_multiplier * consecutive_good_count as f64);
            interval_days *= bonus;
        }

        // Apply consecutive penalty for again/hard ratings
        if matches!(rating, ReviewRating::Again | ReviewRating::Hard) && consecutive_hard_count > 0 {
            let penalty = 1.0 - (self.params.consecutive_penalty_multiplier * consecutive_hard_count as f64);
            interval_days *= penalty.max(0.25); // Cap penalty at 75% reduction
        }

        // Apply max interval cap (minimum 4 hours)
        let interval_days = interval_days
            .max(self.params.again_interval_hours as f64 / 24.0)
            .min(self.params.max_interval_days as f64);

        // Round to reasonable precision
        let interval_days_rounded = if interval_days < 1.0 {
            // For intervals less than a day, round to 2 decimal places
            (interval_days * 100.0).round() / 100.0
        } else {
            // For longer intervals, round to 1 decimal place
            interval_days.round()
        };

        // Calculate next review date
        let interval_seconds = (interval_days_rounded * 86400.0).round() as i64;
        let next_review = Utc::now() + Duration::seconds(interval_seconds);

        // Calculate new consecutive count
        let (new_consecutive_good, new_consecutive_hard) = match rating {
            ReviewRating::Again | ReviewRating::Hard => (0, consecutive_hard_count + 1),
            ReviewRating::Good | ReviewRating::Easy => (consecutive_good_count + 1, 0),
        };

        // Generate scheduling reason
        let scheduling_reason = if new_consecutive_good > 1 {
            format!(
                "Incremental - Rating: {} ({}x consecutive), Interval: {:.1} days",
                rating_name, new_consecutive_good, interval_days_rounded
            )
        } else if new_consecutive_hard > 1 {
            format!(
                "Incremental - Rating: {} ({}x consecutive), Interval: {:.1} days",
                rating_name, new_consecutive_hard, interval_days_rounded
            )
        } else {
            format!(
                "Incremental - Rating: {}, Interval: {:.1} days",
                rating_name, interval_days_rounded
            )
        };

        // Update consecutive count for tracking (we'll track consecutive good)
        let next_consecutive_count = if matches!(rating, ReviewRating::Good | ReviewRating::Easy) {
            new_consecutive_good
        } else {
            // Store negative for hard/again counts
            -new_consecutive_hard
        };

        IncrementalScheduleResult {
            next_review,
            stability: interval_days_rounded, // Use interval as stability for compatibility
            difficulty: match rating {
                ReviewRating::Again => 7.0,
                ReviewRating::Hard => 6.0,
                ReviewRating::Good => 4.0,
                ReviewRating::Easy => 2.0,
            },
            interval_days: interval_days_rounded as i64,
            scheduling_reason,
            consecutive_count: next_consecutive_count,
        }
    }

    /// Get the scheduler parameters
    pub fn params(&self) -> &IncrementalSchedulerParams {
        &self.params
    }

    /// Update the scheduler parameters
    pub fn update_params(&mut self, params: IncrementalSchedulerParams) {
        self.params = params;
    }
}

impl Default for IncrementalScheduler {
    fn default() -> Self {
        Self::default_params()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_incremental_scheduling_again() {
        let scheduler = IncrementalScheduler::default_params();

        let result = scheduler.schedule_item(ReviewRating::Again, None, 0, 0);

        // Again should give short interval (4 hours = ~0.17 days)
        assert!(result.interval_days >= 0 && result.interval_days < 1);
        assert!(result.next_review > Utc::now());
        assert!(result.scheduling_reason.contains("Again"));
    }

    #[test]
    fn test_incremental_scheduling_hard() {
        let scheduler = IncrementalScheduler::default_params();

        let result = scheduler.schedule_item(ReviewRating::Hard, None, 0, 0);

        // Hard should give 1 day interval
        assert_eq!(result.interval_days, 1);
        assert!(result.scheduling_reason.contains("Hard"));
    }

    #[test]
    fn test_incremental_scheduling_good() {
        let scheduler = IncrementalScheduler::default_params();

        let result = scheduler.schedule_item(ReviewRating::Good, None, 0, 0);

        // Good should give 3 days interval
        assert_eq!(result.interval_days, 3);
        assert!(result.scheduling_reason.contains("Good"));
    }

    #[test]
    fn test_incremental_scheduling_easy() {
        let scheduler = IncrementalScheduler::default_params();

        let result = scheduler.schedule_item(ReviewRating::Easy, None, 0, 0);

        // Easy should give 7 days interval
        assert_eq!(result.interval_days, 7);
        assert!(result.scheduling_reason.contains("Easy"));
    }

    #[test]
    fn test_incremental_consecutive_bonus() {
        let scheduler = IncrementalScheduler::default_params();

        // First good rating: 3 days
        let result1 = scheduler.schedule_item(ReviewRating::Good, None, 0, 0);
        assert_eq!(result1.interval_days, 3);

        // Second consecutive good: 3 * 1.2 = 3.6 days
        let result2 = scheduler.schedule_item(ReviewRating::Good, Some(3), 1, 0);
        assert_eq!(result2.interval_days, 4); // Rounds to 4

        // Third consecutive good: 3 * 1.4 = 4.2 days
        let result3 = scheduler.schedule_item(ReviewRating::Good, Some(4), 2, 0);
        assert_eq!(result3.interval_days, 4); // Rounds to 4
    }

    #[test]
    fn test_incremental_consecutive_penalty() {
        let scheduler = IncrementalScheduler::default_params();

        // First hard rating: 1 day
        let result1 = scheduler.schedule_item(ReviewRating::Hard, None, 0, 0);
        assert_eq!(result1.interval_days, 1);

        // Second consecutive hard: 1 * 0.85 = 0.85 days
        let result2 = scheduler.schedule_item(ReviewRating::Hard, Some(1), 0, 1);
        assert!(result2.interval_days < 1); // Should be less than 1 day
    }

    #[test]
    fn test_incremental_max_interval_cap() {
        let scheduler = IncrementalScheduler::default_params();

        // Even with many consecutive good ratings, should not exceed max
        let result = scheduler.schedule_item(ReviewRating::Easy, None, 100, 0);

        assert!(result.interval_days <= scheduler.params().max_interval_days);
    }

    #[test]
    fn test_incremental_reset_consecutive_on_rating_change() {
        let scheduler = IncrementalScheduler::default_params();

        // After 3 good ratings
        let result1 = scheduler.schedule_item(ReviewRating::Good, None, 3, 0);
        assert!(result1.consecutive_count > 0);

        // An again rating should reset consecutive good count
        let result2 = scheduler.schedule_item(ReviewRating::Again, Some(3), 0, 0);
        assert!(result2.consecutive_count < 0); // Negative indicates consecutive hard/again
    }

    #[test]
    fn test_incremental_custom_params() {
        let custom_params = IncrementalSchedulerParams {
            again_interval_hours: 1,
            hard_interval_days: 2,
            good_interval_days: 5,
            easy_interval_days: 10,
            max_interval_days: 14,
            consecutive_bonus_multiplier: 0.5,
            consecutive_penalty_multiplier: 0.3,
        };

        let scheduler = IncrementalScheduler::new(custom_params);

        let result = scheduler.schedule_item(ReviewRating::Good, None, 0, 0);

        assert_eq!(result.interval_days, 5);
    }
}
