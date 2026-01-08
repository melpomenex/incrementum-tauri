//! FSRS-5 (Free Spaced Repetition Scheduler) implementation
//!
//! Based on the FSRS-5 paper and reference implementation:
//! https://github.com/open-spaced-repetition/fsrs-rs

use crate::models::ReviewRating;
use serde::{Deserialize, Serialize};

/// FSRS-5 parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FSRSParams {
    /// Request retention (0.0 - 1.0)
    pub request_retention: f64,
    /// Maximum interval (in days)
    pub maximum_interval: f64,
    /// Stability short-term modifier for "Again" rating
    pub stability_short_term_again: f64,
    /// Stability short-term modifier for "Hard" rating
    pub stability_short_term_hard: f64,
    /// Stability short-term modifier for "Good" rating
    pub stability_short_term_good: f64,
    /// Stability long-term modifier for "Again" rating
    pub stability_long_term_again: f64,
    /// Stability long-term modifier for "Hard" rating
    pub stability_long_term_hard: f64,
    /// Stability long-term modifier for "Good" rating
    pub stability_long_term_good: f64,
    /// Difficulty modifier for "Again" rating
    pub difficulty_modifier_again: f64,
    /// Difficulty modifier for "Hard" rating
    pub difficulty_modifier_hard: f64,
    /// Difficulty modifier for "Good" rating
    pub difficulty_modifier_good: f64,
}

impl Default for FSRSParams {
    fn default() -> Self {
        Self {
            request_retention: 0.9,
            maximum_interval: 36500.0, // 100 years
            stability_short_term_again: 0.4,
            stability_short_term_hard: 0.6,
            stability_short_term_good: 2.0,
            stability_long_term_again: 0.2,
            stability_long_term_hard: 0.8,
            stability_long_term_good: 1.3,
            difficulty_modifier_again: 2.0,
            difficulty_modifier_hard: 0.2,
            difficulty_modifier_good: -0.2,
        }
    }
}

/// FSRS memory state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FSRSState {
    /// Stability (how long memory lasts)
    pub stability: f64,
    /// Difficulty (how hard the item is)
    pub difficulty: f64,
}

impl Default for FSRSState {
    fn default() -> Self {
        Self {
            stability: 0.0,
            difficulty: 5.0,
        }
    }
}

/// FSRS scheduler
pub struct FSRSScheduler {
    params: FSRSParams,
}

impl FSRSScheduler {
    /// Create a new FSRS scheduler
    pub fn new(params: FSRSParams) -> Self {
        Self { params }
    }

    /// Create with default parameters
    pub fn default_params() -> Self {
        Self::new(FSRSParams::default())
    }

    /// Calculate next state after review
    pub fn next_state(
        &self,
        current_state: &FSRSState,
        rating: ReviewRating,
        elapsed_days: f64,
    ) -> FSRSState {
        let is_short_term = elapsed_days < current_state.stability;

        let (new_stability, new_difficulty) = if is_short_term {
            self.calculate_short_term(current_state, rating)
        } else {
            self.calculate_long_term(current_state, rating, elapsed_days)
        };

        FSRSState {
            stability: new_stability.max(0.1).min(self.params.maximum_interval),
            difficulty: new_difficulty.max(1.0).min(10.0),
        }
    }

    /// Calculate short-term memory update
    fn calculate_short_term(
        &self,
        state: &FSRSState,
        rating: ReviewRating,
    ) -> (f64, f64) {
        let (stability_mod, difficulty_mod) = match rating {
            ReviewRating::Again => (
                self.params.stability_short_term_again,
                self.params.difficulty_modifier_again,
            ),
            ReviewRating::Hard => (
                self.params.stability_short_term_hard,
                self.params.difficulty_modifier_hard,
            ),
            ReviewRating::Good => (
                self.params.stability_short_term_good,
                self.params.difficulty_modifier_good,
            ),
            ReviewRating::Easy => (
                self.params.stability_short_term_good * 1.3,
                self.params.difficulty_modifier_good * 1.5,
            ),
        };

        let new_stability = state.stability * stability_mod;
        let new_difficulty = (state.difficulty + difficulty_mod).max(1.0).min(10.0);

        (new_stability, new_difficulty)
    }

    /// Calculate long-term memory update
    fn calculate_long_term(
        &self,
        state: &FSRSState,
        rating: ReviewRating,
        elapsed_days: f64,
    ) -> (f64, f64) {
        // Calculate retrievability
        let retrievability = (1.0 + elapsed_days / (9.0 * state.stability)).powf(-1.0);

        let (stability_mod, difficulty_mod) = match rating {
            ReviewRating::Again => (
                self.params.stability_long_term_again,
                self.params.difficulty_modifier_again,
            ),
            ReviewRating::Hard => (
                self.params.stability_long_term_hard,
                self.params.difficulty_modifier_hard,
            ),
            ReviewRating::Good => (
                self.params.stability_long_term_good,
                self.params.difficulty_modifier_good,
            ),
            ReviewRating::Easy => (
                self.params.stability_long_term_good * 1.5,
                self.params.difficulty_modifier_good * 2.0,
            ),
        };

        // Update stability based on retrievability and rating
        let new_stability = state.stability * (1.0 + stability_mod * (1.0 - retrievability));
        let new_difficulty = (state.difficulty + difficulty_mod).max(1.0).min(10.0);

        (new_stability, new_difficulty)
    }

    /// Calculate interval for desired retention
    pub fn calculate_interval(&self, stability: f64) -> f64 {
        // I = S * (ln(R) / ln(0.9))
        let stability_ratio = (self.params.request_retention.ln() / 0.9_f64.ln()).abs();
        (stability * stability_ratio)
            .max(1.0)
            .min(self.params.maximum_interval)
    }

    /// Get next interval in days
    pub fn next_interval(&self, state: &FSRSState) -> i32 {
        self.calculate_interval(state.stability).round() as i32
    }

    /// Predict probability of retention
    pub fn predict_retention(&self, state: &FSRSState, elapsed_days: f64) -> f64 {
        // R = (1 + elapsed / (9 * S))^(-1)
        (1.0 + elapsed_days / (9.0 * state.stability)).powf(-1.0)
    }

    /// Get current parameters
    pub fn params(&self) -> &FSRSParams {
        &self.params
    }

    /// Update parameters
    pub fn update_params(&mut self, params: FSRSParams) {
        self.params = params;
    }

    /// Set desired retention
    pub fn set_request_retention(&mut self, retention: f64) {
        self.params.request_retention = retention.clamp(0.7, 0.99);
    }
}

impl Default for FSRSScheduler {
    fn default() -> Self {
        Self::default_params()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fsrs_initial_state() {
        let scheduler = FSRSScheduler::default();
        let state = FSRSState::default();

        // First review should give short interval
        let next = scheduler.next_state(&state, ReviewRating::Good, 0.0);
        assert!(next.stability > 0.0);
        assert!(next.difficulty > 0.0);
    }

    #[test]
    fn test_fsrs_interval_calculation() {
        let scheduler = FSRSScheduler::default();
        let state = FSRSState {
            stability: 10.0,
            difficulty: 5.0,
        };

        let interval = scheduler.next_interval(&state);
        assert!(interval > 0);
    }

    #[test]
    fn test_fsrs_retention_prediction() {
        let scheduler = FSRSScheduler::default();
        let state = FSRSState {
            stability: 10.0,
            difficulty: 5.0,
        };

        // Predict retention after 5 days
        let retention = scheduler.predict_retention(&state, 5.0);
        assert!(retention > 0.0 && retention <= 1.0);

        // Predict retention after 20 days (should be lower)
        let retention_later = scheduler.predict_retention(&state, 20.0);
        assert!(retention_later < retention);
    }

    #[test]
    fn test_fsrs_rating_effects() {
        let scheduler = FSRSScheduler::default();
        let state = FSRSState {
            stability: 10.0,
            difficulty: 5.0,
        };

        // Easy should increase stability more than good
        let easy = scheduler.next_state(&state, ReviewRating::Easy, 5.0);
        let good = scheduler.next_state(&state, ReviewRating::Good, 5.0);

        assert!(easy.stability > good.stability);
    }
}
