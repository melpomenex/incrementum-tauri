//! SuperMemo algorithms implementation
//!
//! Implements various SuperMemo algorithms:
//! - SM-2 (the classic algorithm)
//! - SM-5 (improved version)
//! - SM-8 (with optimal intervals)
//! - SM-15 (modern implementation)

use crate::models::ReviewRating;
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};

/// SM-2 algorithm state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SM2State {
    /// Ease factor (minimum 1.3)
    pub ease_factor: f64,
    /// Interval in days
    pub interval: f64,
    /// Number of successful repetitions
    pub repetitions: u32,
}

impl Default for SM2State {
    fn default() -> Self {
        Self {
            ease_factor: 2.5,
            interval: 0.0,
            repetitions: 0,
        }
    }
}

/// SM-2 algorithm
pub struct SM2Algorithm {
    min_ease_factor: f64,
}

impl Default for SM2Algorithm {
    fn default() -> Self {
        Self::new()
    }
}

impl SM2Algorithm {
    pub fn new() -> Self {
        Self {
            min_ease_factor: 1.3,
        }
    }

    /// Calculate next state after review
    pub fn next_state(&self, state: &SM2State, rating: ReviewRating) -> SM2State {
        // Map our rating to SM-2 quality (0-5 scale)
        let quality = match rating {
            ReviewRating::Again => 0,  // Complete blackout
            ReviewRating::Hard => 3,   // Hard with correct response
            ReviewRating::Good => 4,   // Good response
            ReviewRating::Easy => 5,   // Perfect response
        };

        let mut new_state = state.clone();

        if quality < 3 {
            // Failed review - reset
            new_state.repetitions = 0;
            new_state.interval = 0.0;
        } else {
            // Successful review
            new_state.repetitions += 1;

            // Calculate interval based on repetition number
            new_state.interval = match new_state.repetitions {
                1 => 1.0,
                2 => 6.0,
                _ => state.interval * state.ease_factor,
            };

            // Update ease factor
            // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            let ef_update = 0.1 - (5.0 - quality as f64) * (0.08 + (5.0 - quality as f64) * 0.02);
            new_state.ease_factor = (state.ease_factor + ef_update).max(self.min_ease_factor);
        }

        new_state
    }

    /// Get next interval in days
    pub fn next_interval(&self, state: &SM2State) -> i32 {
        state.interval.max(0.0).round() as i32
    }

    /// Calculate next review date
    pub fn next_review_date(&self, state: &SM2State) -> chrono::DateTime<Utc> {
        let days = self.next_interval(state) as i64;
        Utc::now() + Duration::days(days)
    }
}

/// SM-5 algorithm state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SM5State {
    /// Ease factor
    pub ease_factor: f64,
    /// Current interval
    pub interval: f64,
    /// Number of repetitions
    pub repetitions: u32,
    /// Modified factor for SM-5
    pub modifier: f64,
}

impl Default for SM5State {
    fn default() -> Self {
        Self {
            ease_factor: 2.5,
            interval: 0.0,
            repetitions: 0,
            modifier: 1.0,
        }
    }
}

/// SM-5 algorithm (improved SM-2)
pub struct SM5Algorithm {
    min_ease_factor: f64,
}

impl Default for SM5Algorithm {
    fn default() -> Self {
        Self::new()
    }
}

impl SM5Algorithm {
    pub fn new() -> Self {
        Self {
            min_ease_factor: 1.3,
        }
    }

    pub fn next_state(&self, state: &SM5State, rating: ReviewRating) -> SM5State {
        let quality = match rating {
            ReviewRating::Again => 0,
            ReviewRating::Hard => 3,
            ReviewRating::Good => 4,
            ReviewRating::Easy => 5,
        };

        let mut new_state = state.clone();

        if quality < 3 {
            new_state.repetitions = 0;
            new_state.interval = 0.0;
        } else {
            new_state.repetitions += 1;

            // SM-5 uses modifier for better interval calculation
            new_state.interval = match new_state.repetitions {
                1 => 1.0 * state.modifier,
                2 => 6.0 * state.modifier,
                _ => state.interval * state.ease_factor * state.modifier,
            };

            // Update ease factor (same as SM-2)
            let ef_update = 0.1 - (5.0 - quality as f64) * (0.08 + (5.0 - quality as f64) * 0.02);
            new_state.ease_factor = (state.ease_factor + ef_update).max(self.min_ease_factor);

            // Update modifier based on performance
            new_state.modifier = match quality {
                5 => state.modifier * 1.1,  // Easy - increase future intervals
                4 => state.modifier,
                3 => state.modifier * 0.9,  // Hard - decrease future intervals
                _ => state.modifier * 0.8,
            };

            // Keep modifier in reasonable range
            new_state.modifier = new_state.modifier.clamp(0.5, 2.0);
        }

        new_state
    }

    pub fn next_interval(&self, state: &SM5State) -> i32 {
        state.interval.max(0.0).round() as i32
    }
}

/// SM-8 algorithm with optimal intervals
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SM8State {
    pub ease_factor: f64,
    pub interval: f64,
    pub repetitions: u32,
    /// Lapses count
    pub lapses: u32,
}

impl Default for SM8State {
    fn default() -> Self {
        Self {
            ease_factor: 2.5,
            interval: 0.0,
            repetitions: 0,
            lapses: 0,
        }
    }
}

/// SM-8 algorithm
pub struct SM8Algorithm {
    min_ease_factor: f64,
}

impl Default for SM8Algorithm {
    fn default() -> Self {
        Self::new()
    }
}

impl SM8Algorithm {
    pub fn new() -> Self {
        Self {
            min_ease_factor: 1.3,
        }
    }

    pub fn next_state(&self, state: &SM8State, rating: ReviewRating) -> SM8State {
        let quality = match rating {
            ReviewRating::Again => 0,
            ReviewRating::Hard => 3,
            ReviewRating::Good => 4,
            ReviewRating::Easy => 5,
        };

        let mut new_state = state.clone();

        if quality < 3 {
            // Failed - reset with penalty for lapses
            new_state.repetitions = 0;
            new_state.interval = 0.0;
            new_state.lapses += 1;

            // Reduce ease factor slightly on lapse
            new_state.ease_factor = (state.ease_factor - 0.2).max(self.min_ease_factor);
        } else {
            // Successful
            new_state.repetitions += 1;

            // SM-8 uses optimal intervals: 1, 2, 4, 7, 12, 20, 34, ...
            let optimal_intervals = [1.0, 2.0, 4.0, 7.0, 12.0, 20.0, 34.0, 57.0, 95.0, 158.0];
            let rep_index = (new_state.repetitions as usize).saturating_sub(1);

            new_state.interval = if rep_index < optimal_intervals.len() {
                optimal_intervals[rep_index] * state.ease_factor
            } else {
                state.interval * state.ease_factor
            };

            // Update ease factor
            let ef_update = 0.1 - (5.0 - quality as f64) * (0.08 + (5.0 - quality as f64) * 0.02);
            new_state.ease_factor = (state.ease_factor + ef_update).max(self.min_ease_factor);
        }

        new_state
    }

    pub fn next_interval(&self, state: &SM8State) -> i32 {
        state.interval.max(0.0).round() as i32
    }
}

/// SM-15 algorithm (modern SuperMemo)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SM15State {
    pub stability: f64,
    pub difficulty: f64,
}

impl Default for SM15State {
    fn default() -> Self {
        Self {
            stability: 0.0,
            difficulty: 5.0,
        }
    }
}

/// SM-15 algorithm (simplified modern version)
pub struct SM15Algorithm {
    request_retention: f64,
}

impl Default for SM15Algorithm {
    fn default() -> Self {
        Self::new()
    }
}

impl SM15Algorithm {
    pub fn new() -> Self {
        Self {
            request_retention: 0.9,
        }
    }

    pub fn next_state(&self, state: &SM15State, rating: ReviewRating) -> SM15State {
        let _rating_value = match rating {
            ReviewRating::Again => 1,
            ReviewRating::Hard => 2,
            ReviewRating::Good => 3,
            ReviewRating::Easy => 4,
        };

        // Simplified SM-15 formulas
        let stability_factor = match rating {
            ReviewRating::Again => 0.5,
            ReviewRating::Hard => 0.8,
            ReviewRating::Good => 1.2,
            ReviewRating::Easy => 1.5,
        };

        let difficulty_factor = match rating {
            ReviewRating::Again => 0.2,
            ReviewRating::Hard => 0.1,
            ReviewRating::Good => 0.0,
            ReviewRating::Easy => -0.1,
        };

        let new_stability = if state.stability == 0.0 {
            // First review
            match rating {
                ReviewRating::Again => 0.5,
                ReviewRating::Hard => 1.0,
                ReviewRating::Good => 2.0,
                ReviewRating::Easy => 4.0,
            }
        } else {
            state.stability * stability_factor
        };

        let new_difficulty = (state.difficulty + difficulty_factor).clamp(1.0, 10.0);

        SM15State {
            stability: new_stability.max(0.1),
            difficulty: new_difficulty,
        }
    }

    pub fn next_interval(&self, state: &SM15State) -> i32 {
        // Similar to FSRS, use stability to calculate interval
        let stability_ratio = (self.request_retention.ln() / 0.9_f64.ln()).abs();
        (state.stability * stability_ratio).round() as i32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sm2_basic() {
        let algorithm = SM2Algorithm::new();
        let state = SM2State::default();

        // Good rating should advance repetitions
        let next = algorithm.next_state(&state, ReviewRating::Good);
        assert_eq!(next.repetitions, 1);
        assert_eq!(next.interval, 1.0);

        // Another good rating
        let next2 = algorithm.next_state(&next, ReviewRating::Good);
        assert_eq!(next2.repetitions, 2);
        assert_eq!(next2.interval, 6.0);
    }

    #[test]
    fn test_sm2_failure() {
        let algorithm = SM2Algorithm::new();
        let state = SM2State {
            ease_factor: 2.5,
            interval: 10.0,
            repetitions: 5,
        };

        // Again rating should reset
        let next = algorithm.next_state(&state, ReviewRating::Again);
        assert_eq!(next.repetitions, 0);
        assert_eq!(next.interval, 0.0);
    }

    #[test]
    fn test_sm5_modifier() {
        let algorithm = SM5Algorithm::new();
        let state = SM5State::default();

        // Easy rating should increase modifier
        let next = algorithm.next_state(&state, ReviewRating::Easy);
        assert!(next.modifier > 1.0);

        // Hard rating should decrease modifier
        let next2 = algorithm.next_state(&next, ReviewRating::Hard);
        assert!(next2.modifier < next.modifier);
    }

    #[test]
    fn test_sm15_initial() {
        let algorithm = SM15Algorithm::new();
        let state = SM15State::default();

        let next = algorithm.next_state(&state, ReviewRating::Good);
        assert!(next.stability > 0.0);
        assert!(next.difficulty > 0.0);
    }
}
