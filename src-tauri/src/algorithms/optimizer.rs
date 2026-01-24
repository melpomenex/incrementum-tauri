//! Algorithm parameter optimization
//!
//! This module provides tools for optimizing scheduling algorithm parameters
//! based on historical review data.

use crate::models::{LearningItem, ReviewRating};
use chrono::{Utc, Duration};

/// Optimization result
#[derive(Debug, Clone, serde::Serialize)]
pub struct OptimizationResult {
    /// Best parameters found
    pub best_params: OptimizationParams,
    /// Expected retention with best parameters
    pub expected_retention: f64,
    /// Number of iterations performed
    pub iterations: u32,
    /// Optimization completed successfully
    pub converged: bool,
}

/// Optimizable parameters
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OptimizationParams {
    /// Minimum ease factor for SM-2
    pub min_ease_factor: f64,
    /// Initial ease factor for SM-2
    pub initial_ease_factor: f64,
    /// Desired retention rate (0.0 - 1.0)
    pub desired_retention: f64,
}

impl Default for OptimizationParams {
    fn default() -> Self {
        Self {
            min_ease_factor: 1.3,
            initial_ease_factor: 2.5,
            desired_retention: 0.9,
        }
    }
}

/// Historical review data for optimization
#[derive(Debug, Clone)]
pub struct ReviewHistory {
    pub item_id: String,
    pub rating: ReviewRating,
    pub actual_retention: bool, // Whether user remembered correctly
    pub days_since_previous_review: i32,
}

/// Parameter optimizer
pub struct ParameterOptimizer {
    /// Maximum iterations to perform
    max_iterations: u32,
    /// Convergence threshold
    convergence_threshold: f64,
    /// Learning rate for parameter updates
    learning_rate: f64,
}

impl Default for ParameterOptimizer {
    fn default() -> Self {
        Self {
            max_iterations: 100,
            convergence_threshold: 0.001,
            learning_rate: 0.01,
        }
    }
}

impl ParameterOptimizer {
    pub fn new() -> Self {
        Self::default()
    }

    /// Optimize SM-2 parameters based on historical data
    pub fn optimize_sm2(
        &self,
        history: &[ReviewHistory],
        initial_params: OptimizationParams,
    ) -> OptimizationResult {
        if history.is_empty() {
            return OptimizationResult {
                best_params: initial_params,
                expected_retention: 0.5,
                iterations: 0,
                converged: false,
            };
        }

        let mut best_params = initial_params.clone();
        let mut best_score = self.evaluate_params(&best_params, history);
        let mut converged = false;

        for _iteration in 0..self.max_iterations {
            // Generate neighboring parameters
            let neighbors = self.generate_neighbors(&best_params);

            // Find best neighbor
            let mut improved = false;
            for neighbor in neighbors {
                let score = self.evaluate_params(&neighbor, history);
                if score > best_score {
                    best_params = neighbor;
                    best_score = score;
                    improved = true;
                }
            }

            // Check for convergence
            if !improved {
                converged = true;
                break;
            }

            // Early stopping if score is good enough
            if best_score >= 0.95 {
                converged = true;
                break;
            }
        }

        OptimizationResult {
            best_params,
            expected_retention: best_score,
            iterations: self.max_iterations,
            converged,
        }
    }

    /// Evaluate parameter quality based on historical data
    fn evaluate_params(&self, params: &OptimizationParams, history: &[ReviewHistory]) -> f64 {
        if history.is_empty() {
            return 0.5; // Neutral score for no data
        }

        let mut correct_predictions = 0;
        let mut total_predictions = 0;

        for record in history {
            // Simulate what the algorithm would predict
            let predicted_interval = self.predict_interval(params, record.days_since_previous_review);

            // Check if prediction matches actual outcome
            // For simplicity, we use rating as proxy for retention
            let was_retained = matches!(record.rating, ReviewRating::Good | ReviewRating::Easy);

            // Predict retention based on interval (simplified model)
            let predicted_retention = self.retention_from_interval(predicted_interval, params.desired_retention);

            if (predicted_retention >= 0.5 && was_retained) || (predicted_retention < 0.5 && !was_retained) {
                correct_predictions += 1;
            }
            total_predictions += 1;
        }

        if total_predictions == 0 {
            return 0.5;
        }

        correct_predictions as f64 / total_predictions as f64
    }

    /// Predict interval based on parameters and days since last review
    fn predict_interval(&self, params: &OptimizationParams, days_since: i32) -> f64 {
        // Simplified model: longer gaps = lower predicted retention
        // This is a placeholder for a more sophisticated model
        let base_interval = params.initial_ease_factor;
        let decay = 1.0 / (1.0 + days_since as f64 / 30.0);
        base_interval * decay
    }

    /// Estimate retention from interval
    fn retention_from_interval(&self, interval: f64, desired: f64) -> f64 {
        // Simplified retention model
        // Shorter intervals = higher retention
        let max_interval = 365.0; // 1 year
        let retention = 1.0 - (interval / max_interval).min(1.0) * (1.0 - desired);
        retention.max(0.0).min(1.0)
    }

    /// Generate neighboring parameter sets for exploration
    fn generate_neighbors(&self, params: &OptimizationParams) -> Vec<OptimizationParams> {
        let mut neighbors = Vec::new();

        // Vary each parameter by ± learning rate
        for delta in &[-0.1, 0.1] {
            neighbors.push(OptimizationParams {
                min_ease_factor: (params.min_ease_factor + delta).max(1.1).min(2.0),
                ..params.clone()
            });

            neighbors.push(OptimizationParams {
                initial_ease_factor: (params.initial_ease_factor + delta).max(1.5).min(3.5),
                ..params.clone()
            });

            neighbors.push(OptimizationParams {
                desired_retention: (params.desired_retention + delta).max(0.7).min(0.99),
                ..params.clone()
            });
        }

        neighbors
    }
}

/// Calculate simple statistics for review performance
pub fn calculate_review_statistics(items: &[LearningItem]) -> ReviewStatistics {
    if items.is_empty() {
        return ReviewStatistics::default();
    }

    let total_reviews: i32 = items.iter().map(|i| i.review_count).sum();
    let total_lapses: i32 = items.iter().map(|i| i.lapses).sum();

    // Calculate average interval
    let avg_interval: f64 = items.iter().map(|i| i.interval).sum::<f64>() / items.len() as f64;

    // Calculate retention estimate (simplified)
    let retention_estimate = if total_reviews > 0 {
        1.0 - (total_lapses as f64 / total_reviews as f64)
    } else {
        0.9 // Default estimate
    };

    // Calculate items due within time ranges
    let now = Utc::now();
    let due_today = items.iter().filter(|i| i.due_date <= now).count();
    let due_week = items.iter().filter(|i| i.due_date <= now + Duration::days(7)).count();
    let due_month = items.iter().filter(|i| i.due_date <= now + Duration::days(30)).count();

    ReviewStatistics {
        total_items: items.len() as i32,
        total_reviews,
        total_lapses,
        avg_interval,
        retention_estimate,
        due_today: due_today as i32,
        due_week: due_week as i32,
        due_month: due_month as i32,
    }
}

/// Review statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct ReviewStatistics {
    pub total_items: i32,
    pub total_reviews: i32,
    pub total_lapses: i32,
    pub avg_interval: f64,
    pub retention_estimate: f64,
    pub due_today: i32,
    pub due_week: i32,
    pub due_month: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_optimization_params_default() {
        let params = OptimizationParams::default();
        assert_eq!(params.min_ease_factor, 1.3);
        assert_eq!(params.initial_ease_factor, 2.5);
        assert_eq!(params.desired_retention, 0.9);
    }

    #[test]
    fn test_review_statistics_empty() {
        let stats = calculate_review_statistics(&[]);
        assert_eq!(stats.total_items, 0);
        assert_eq!(stats.total_reviews, 0);
    }

    #[test]
    fn test_retention_from_interval() {
        let optimizer = ParameterOptimizer::new();
        let short_retention = optimizer.retention_from_interval(1.0, 0.9);
        let long_retention = optimizer.retention_from_interval(100.0, 0.9);

        assert!(short_retention > long_retention);
        assert!(short_retention <= 1.0);
        assert!(long_retention >= 0.0);
    }

    #[test]
    fn test_optimize_sm2_empty_history() {
        let optimizer = ParameterOptimizer::new();
        let result = optimizer.optimize_sm2(&[], OptimizationParams::default());

        // Should return default params with neutral score
        assert_eq!(result.expected_retention, 0.5);
        assert!(!result.converged); // No convergence with empty data
    }
}
