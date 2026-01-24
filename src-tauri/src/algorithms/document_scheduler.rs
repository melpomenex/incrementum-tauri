//! Document scheduler implementation.
//!
//! This module provides document scheduling using the fsrs-rs FSRS-5 algorithm.

use crate::error::Result;
use crate::models::ReviewRating;
use chrono::{Utc, Duration};
use fsrs::{FSRS, MemoryState};
use serde::{Deserialize, Serialize};

/// Document scheduler parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSchedulerParams {
    /// Minimum interval in days
    pub min_interval_days: i64,
    /// Maximum interval in days
    pub max_interval_days: i64,
    /// Target retention rate for FSRS
    pub target_retention: f64,
}

impl Default for DocumentSchedulerParams {
    fn default() -> Self {
        Self {
            min_interval_days: 1,
            max_interval_days: 3650, // 10 years
            target_retention: 0.9,
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
    /// Interval in days
    pub interval_days: i64,
    /// Scheduling reason/explanation
    pub scheduling_reason: String,
}

/// Document scheduler using FSRS-5 algorithm
pub struct DocumentScheduler {
    params: DocumentSchedulerParams,
    fsrs: FSRS,
}

impl DocumentScheduler {
    /// Create a new document scheduler
    pub fn new(params: DocumentSchedulerParams) -> Self {
        let fsrs = FSRS::new(Some(&[])).expect("fsrs::FSRS default parameters must be valid");
        Self {
            params,
            fsrs,
        }
    }

    /// Create with default parameters
    pub fn default_params() -> Self {
        Self::new(DocumentSchedulerParams::default())
    }

    /// Schedule a document using FSRS algorithm
    ///
    /// # Arguments
    /// * `rating` - FSRS rating (Again=1, Hard=2, Good=3, Easy=4)
    /// * `current_stability` - Current stability in days (None for new documents)
    /// * `current_difficulty` - Current difficulty (None for new documents)
    /// * `elapsed_days` - Days since last review (0 for new documents)
    pub fn schedule_document(
        &self,
        rating: ReviewRating,
        current_stability: Option<f64>,
        current_difficulty: Option<f64>,
        elapsed_days: f64,
    ) -> Result<DocumentScheduleResult> {
        let memory_state = match (current_stability, current_difficulty) {
            (Some(stability), Some(difficulty)) if stability > 0.0 && difficulty > 0.0 => {
                Some(MemoryState {
                    stability: stability as f32,
                    difficulty: difficulty as f32,
                })
            }
            _ => None,
        };

        let elapsed_days = elapsed_days.max(0.0) as u32;
        let next_states = self.fsrs.next_states(
            memory_state,
            self.params.target_retention as f32,
            elapsed_days,
        )?;

        let next_state = match rating {
            ReviewRating::Again => &next_states.again,
            ReviewRating::Hard => &next_states.hard,
            ReviewRating::Good => &next_states.good,
            ReviewRating::Easy => &next_states.easy,
        };

        let mut interval_days = next_state.interval as f64;
        if !interval_days.is_finite() || interval_days <= 0.0 {
            interval_days = self.params.min_interval_days as f64;
        }

        let interval_days = interval_days
            .clamp(
                self.params.min_interval_days as f64,
                self.params.max_interval_days as f64,
            )
            .round() as i64;

        let next_review = Utc::now() + Duration::days(interval_days);

        Ok(DocumentScheduleResult {
            next_review,
            stability: next_state.memory.stability as f64,
            difficulty: next_state.memory.difficulty as f64,
            interval_days,
            scheduling_reason: format!(
                "FSRS-5 (fsrs-rs) - Rating: {:?}, Stability: {:.2}, Difficulty: {:.2}",
                rating,
                next_state.memory.stability,
                next_state.memory.difficulty
            ),
        })
    }

    /// Get the scheduler parameters
    pub fn params(&self) -> &DocumentSchedulerParams {
        &self.params
    }

    /// Update the scheduler parameters
    pub fn update_params(&mut self, params: DocumentSchedulerParams) {
        self.params = params;
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
        let result = scheduler
            .schedule_document(ReviewRating::Good, None, None, 0.0)
            .unwrap();

        assert!(result.interval_days >= 1);
        assert!(result.stability > 0.0);
        assert!(result.difficulty > 0.0);
        assert!(result.next_review > Utc::now());
    }

    #[test]
    fn test_document_scheduling_with_existing_stability() {
        let scheduler = DocumentScheduler::default_params();

        // Schedule a document that has been read before
        let result = scheduler
            .schedule_document(ReviewRating::Good, Some(5.0), Some(3.0), 2.0)
            .unwrap();

        assert!(result.interval_days >= 1);
        assert!(result.stability > 0.0);
        assert!(result.next_review > Utc::now());
    }

    #[test]
    fn test_document_scheduling_rating_effect() {
        let scheduler = DocumentScheduler::default_params();

        // Higher rating should result in longer intervals
        let easy_rating = scheduler
            .schedule_document(ReviewRating::Easy, Some(5.0), Some(3.0), 2.0)
            .unwrap();
        let hard_rating = scheduler
            .schedule_document(ReviewRating::Hard, Some(5.0), Some(3.0), 2.0)
            .unwrap();

        // Hard rating should give shorter interval (reviewed sooner)
        assert!(hard_rating.interval_days < easy_rating.interval_days);
    }

    #[test]
    fn test_document_scheduling_again_rating() {
        let scheduler = DocumentScheduler::default_params();

        // Again rating should give very short interval
        let result = scheduler
            .schedule_document(ReviewRating::Again, Some(5.0), Some(3.0), 2.0)
            .unwrap();

        assert!(result.interval_days >= 1);
        assert!(result.next_review > Utc::now());
    }
}
