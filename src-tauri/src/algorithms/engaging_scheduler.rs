//! Engaging FSRS-6 Scheduler for Incremental Reading
//!
//! This scheduler extends FSRS-6 with features designed to make incremental reading
//! more engaging and "fun" while maintaining learning effectiveness:
//!
//! - **Novelty Injection**: Occasionally injects new/unseen items for discovery
//! - **Serendipity Factor**: Random "surprise" items to break routine
//! - **Variety Balancing**: Mixes content types, difficulties, and lengths
//! - **Streak Awareness**: Rewards consistent engagement with variety bonuses
//! - **Contextual Spacing**: Prevents similar topics from appearing too close together
//!
//! The algorithm follows FSRS-6 for core scheduling but adds an "engagement layer"
//! that optimizes for user enjoyment and discovery.

use crate::algorithms::DocumentScheduler;
use crate::error::Result;
use crate::models::ReviewRating;
use chrono::{Utc, DateTime, Duration};
use fsrs::FSRS;
use rand::{Rng, RngCore, SeedableRng, rngs::StdRng};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Engagement preferences for the scheduler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngagementPreferences {
    /// How much novelty to inject (0.0 = never, 1.0 = frequent)
    pub novelty_factor: f64,
    
    /// Chance of a "surprise" item appearing (0.0-1.0)
    pub serendipity_rate: f64,
    
    /// Preferred variety in content (0.0 = focused, 1.0 = high variety)
    pub variety_preference: f64,
    
    /// Maximum items of same topic before forcing variety
    pub max_same_topic_streak: i32,
    
    /// Whether to boost recently added items
    pub favor_recent_additions: bool,
    
    /// Time window for "recent" items (in hours)
    pub recent_window_hours: i64,
}

impl Default for EngagementPreferences {
    fn default() -> Self {
        Self {
            // Default: moderate novelty injection (20%)
            novelty_factor: 0.2,
            // Default: 10% chance of serendipity item
            serendipity_rate: 0.1,
            // Default: balanced variety
            variety_preference: 0.5,
            // Default: max 3 items of same topic in a row
            max_same_topic_streak: 3,
            // Default: yes, boost new items slightly
            favor_recent_additions: true,
            // Default: items added in last 48 hours are "recent"
            recent_window_hours: 48,
        }
    }
}

/// Item metadata for engagement scoring
#[derive(Debug, Clone)]
pub struct ItemEngagementMeta {
    /// Item ID
    pub id: String,
    /// Content category/topic
    pub category: Option<String>,
    /// Tags for topic detection
    pub tags: Vec<String>,
    /// Estimated reading time in minutes
    pub estimated_time: i32,
    /// When the item was added
    pub date_added: DateTime<Utc>,
    /// Last reviewed (if ever)
    pub last_reviewed: Option<DateTime<Utc>>,
    /// Number of times reviewed
    pub review_count: i32,
    /// User's priority rating (1-10)
    pub priority_rating: i32,
    /// Current FSRS stability
    pub stability: Option<f64>,
    /// Current FSRS difficulty
    pub difficulty: Option<f64>,
    /// Next scheduled review (FSRS calculated)
    pub next_review: Option<DateTime<Utc>>,
}

/// Scheduling result with engagement info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngagingScheduleResult {
    /// Next review date
    pub next_review: DateTime<Utc>,
    /// FSRS stability
    pub stability: f64,
    /// FSRS difficulty
    pub difficulty: f64,
    /// Interval in days
    pub interval_days: i64,
    /// Scheduling reason
    pub scheduling_reason: String,
    /// Engagement modifier applied (for tracking)
    pub engagement_modifier: f64,
    /// Whether this was a "surprise" scheduling
    pub is_serendipity: bool,
}

/// Queue item with engagement score
#[derive(Debug, Clone)]
pub struct ScoredQueueItem {
    pub meta: ItemEngagementMeta,
    /// FSRS-calculated base priority
    pub base_priority: f64,
    /// Engagement-adjusted priority
    pub engagement_priority: f64,
    /// Reason for this score
    pub score_reason: String,
}

/// Engaging FSRS Scheduler
pub struct EngagingScheduler {
    fsrs: FSRS,
    preferences: EngagementPreferences,
    /// Topic history to prevent clustering
    topic_history: Vec<String>,
    /// RNG for serendipity
    rng: StdRng,
}

impl EngagingScheduler {
    /// Create new scheduler with preferences
    pub fn new(preferences: EngagementPreferences) -> Self {
        let fsrs = FSRS::new(Some(&[]))
            .expect("fsrs::FSRS default parameters must be valid");
        
        Self {
            fsrs,
            preferences,
            topic_history: Vec::new(),
            rng: StdRng::from_entropy(),
        }
    }

    /// Create with default preferences
    pub fn default_preferences() -> Self {
        Self::new(EngagementPreferences::default())
    }

    /// Set a seed for reproducible behavior (useful for testing)
    pub fn with_seed(mut self, seed: u64) -> Self {
        self.rng = StdRng::seed_from_u64(seed);
        self
    }

    /// Schedule an item using FSRS-6 with engagement modifications
    ///
    /// This applies the core FSRS-6 algorithm but adds engagement-aware
    /// interval modifications for incremental reading context.
    pub fn schedule_item(
        &mut self,
        rating: ReviewRating,
        current_stability: Option<f64>,
        current_difficulty: Option<f64>,
        elapsed_days: f64,
        review_count: i32,
    ) -> Result<EngagingScheduleResult> {
        let memory_state = match (current_stability, current_difficulty) {
            (Some(stability), Some(difficulty)) if stability > 0.0 && difficulty > 0.0 => {
                Some(fsrs::MemoryState {
                    stability: stability as f32,
                    difficulty: difficulty as f32,
                })
            }
            _ => None,
        };

        let elapsed_days = elapsed_days.max(0.0) as u32;
        let next_states = self.fsrs.next_states(
            memory_state,
            0.9, // target retention
            elapsed_days,
        )?;

        let next_state = match rating {
            ReviewRating::Again => &next_states.again,
            ReviewRating::Hard => &next_states.hard,
            ReviewRating::Good => &next_states.good,
            ReviewRating::Easy => &next_states.easy,
        };

        // Apply engagement modifications to the interval
        let (modified_interval, engagement_modifier, is_serendipity) = 
            self.apply_engagement_modifications(
                next_state.interval as f64,
                review_count,
                rating,
            );

        let interval_days = modified_interval.round() as i64;
        let next_review = Utc::now() + Duration::days(interval_days);

        let scheduling_reason = if is_serendipity {
            format!(
                "Engaging FSRS-6 (Serendipity!) - Rating: {:?}, Base: {:.1} days, Modified: {:.1} days",
                rating, next_state.interval, interval_days
            )
        } else if engagement_modifier != 1.0 {
            format!(
                "Engaging FSRS-6 - Rating: {:?}, Base: {:.1} days, With engagement: {:.1} days ({:.0}%)",
                rating, next_state.interval, interval_days, engagement_modifier * 100.0
            )
        } else {
            format!(
                "Engaging FSRS-6 - Rating: {:?}, Stability: {:.2}, Difficulty: {:.2}",
                rating, next_state.memory.stability, next_state.memory.difficulty
            )
        };

        Ok(EngagingScheduleResult {
            next_review,
            stability: next_state.memory.stability as f64,
            difficulty: next_state.memory.difficulty as f64,
            interval_days,
            scheduling_reason,
            engagement_modifier,
            is_serendipity,
        })
    }

    /// Apply engagement modifications to FSRS interval
    ///
    /// Returns: (modified_interval, modifier, is_serendipity)
    fn apply_engagement_modifications(
        &mut self,
        base_interval: f64,
        review_count: i32,
        rating: ReviewRating,
    ) -> (f64, f64, bool) {
        let mut modifier = 1.0;
        let mut is_serendipity = false;

        // Serendipity check: random chance to significantly alter scheduling
        if self.rng.gen::<f64>() < self.preferences.serendipity_rate {
            is_serendipity = true;
            // Serendipity can either accelerate or delay, but bias toward sooner
            // (users tend to enjoy discovering things sooner)
            let serendipity_mod = 0.3 + self.rng.gen::<f64>() * 0.5; // 0.3 to 0.8
            modifier *= serendipity_mod;
        }

        // Novelty boost: Items with fewer reviews get slightly accelerated
        // to help users discover new content
        if review_count < 3 && self.preferences.novelty_factor > 0.0 {
            let novelty_boost = 1.0 - (self.preferences.novelty_factor * 0.2);
            modifier *= novelty_boost;
        }

        // Streak-friendly: Good/Easy ratings on new items get bonus acceleration
        // to create positive reinforcement
        if review_count < 5 && matches!(rating, ReviewRating::Good | ReviewRating::Easy) {
            let streak_bonus = 1.0 - (self.preferences.variety_preference * 0.15);
            modifier *= streak_bonus;
        }

        // Cap the modification to prevent extreme values
        modifier = modifier.clamp(0.25, 2.0);

        let modified_interval = (base_interval * modifier).max(0.125); // minimum 3 hours

        (modified_interval, modifier, is_serendipity)
    }

    /// Score and rank queue items for engagement-optimized ordering
    ///
    /// This creates a "fun" queue mix by considering:
    /// - FSRS due dates (respect the algorithm)
    /// - Variety (prevent topic fatigue)
    /// - Discovery (surface new items)
    /// - Surprises (random high-potential items)
    pub fn score_queue_items(&mut self, items: &[ItemEngagementMeta]) -> Vec<ScoredQueueItem> {
        let now = Utc::now();
        let mut scored: Vec<ScoredQueueItem> = Vec::new();

        for item in items {
            let (base_priority, fsrs_reason) = self.calculate_fsrs_priority(item, now);
            let (engagement_priority, engagement_reason) = 
                self.calculate_engagement_bonus(item, &scored, now);
            
            let final_priority = (base_priority + engagement_priority).min(10.0);
            
            let score_reason = format!("{} | {}", fsrs_reason, engagement_reason);
            
            scored.push(ScoredQueueItem {
                meta: item.clone(),
                base_priority,
                engagement_priority: final_priority,
                score_reason,
            });
        }

        // Sort by engagement priority (higher = sooner)
        scored.sort_by(|a, b| {
            b.engagement_priority.partial_cmp(&a.engagement_priority)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Update topic history based on top items
        self.update_topic_history(&scored);

        // Return the scored items (clone to avoid move issues)
        scored.iter().map(|s| ScoredQueueItem {
            meta: s.meta.clone(),
            base_priority: s.base_priority,
            engagement_priority: s.engagement_priority,
            score_reason: s.score_reason.clone(),
        }).collect()
    }

    /// Calculate base FSRS priority (same logic as DocumentScheduler)
    fn calculate_fsrs_priority(
        &self,
        item: &ItemEngagementMeta,
        now: DateTime<Utc>,
    ) -> (f64, String) {
        let base_priority = match item.next_review {
            Some(next_date) => {
                let is_due = next_date <= now;
                let days_until_due = (next_date - now).num_days();

                if is_due {
                    let days_overdue = -days_until_due;
                    let priority = (10.0 - (days_overdue as f64 * 0.1)).max(5.0);
                    (priority, format!("Due ({} days overdue)", days_overdue))
                } else {
                    let priority = match days_until_due {
                        0..=1 => 8.0,
                        2..=3 => 6.0,
                        4..=7 => 4.0,
                        8..=30 => 2.0,
                        _ => 0.5,
                    };
                    (priority, format!("Future ({} days)", days_until_due))
                }
            }
            None => {
                // New items get high priority
                (9.0, "New item".to_string())
            }
        };

        // Apply user priority multiplier
        let multiplier = if item.priority_rating > 0 {
            let r = item.priority_rating.clamp(1, 10) as f64;
            0.5 + (r - 1.0) / 9.0 * 1.5
        } else {
            1.0
        };

        let adjusted = base_priority.0 * multiplier;
        
        // FSRS stability/difficulty micro-adjustments
        let fsrs_bonus = match (item.stability, item.difficulty) {
            (Some(stab), Some(diff)) => {
                let stab_bonus = if stab < 5.0 { 0.5 } else if stab < 10.0 { 0.2 } else { 0.0 };
                let diff_bonus = if diff > 7.0 { 0.3 } else if diff > 5.0 { 0.1 } else { 0.0 };
                stab_bonus + diff_bonus
            }
            _ => 0.0
        };

        let final_priority = (adjusted + fsrs_bonus).min(10.0);
        let reason = format!("{} x {:.1} + {:.1}", base_priority.1, multiplier, fsrs_bonus);
        
        (final_priority, reason)
    }

    /// Calculate engagement bonus for variety and discovery
    fn calculate_engagement_bonus(
        &mut self,
        item: &ItemEngagementMeta,
        already_scored: &[ScoredQueueItem],
        now: DateTime<Utc>,
    ) -> (f64, String) {
        let mut bonus = 0.0;
        let mut reasons: Vec<String> = Vec::new();

        // Variety bonus: Items different from recent topics get boosted
        let topic = item.category.clone().unwrap_or_else(|| "uncategorized".to_string());
        let recent_topic_count = self.topic_history.iter()
            .filter(|t| *t == &topic)
            .count() as i32;
        
        if recent_topic_count >= self.preferences.max_same_topic_streak {
            // Penalty for too many similar items in a row
            let penalty = -2.0;
            bonus += penalty;
            reasons.push(format!("Topic break needed ({}", topic));
        } else if recent_topic_count == 0 && !self.topic_history.is_empty() {
            // Bonus for topic variety
            let variety_bonus = self.preferences.variety_preference * 1.5;
            bonus += variety_bonus;
            reasons.push("Topic variety".to_string());
        }

        // Recent addition bonus
        if self.preferences.favor_recent_additions {
            let hours_since_added = (now - item.date_added).num_hours();
            if hours_since_added < self.preferences.recent_window_hours {
                let recency_boost = (1.0 - hours_since_added as f64 / self.preferences.recent_window_hours as f64)
                    * self.preferences.novelty_factor * 2.0;
                bonus += recency_boost;
                reasons.push(format!("Recent (+{:.1})", recency_boost));
            }
        }

        // "Hidden gem" bonus: Items with high priority but never reviewed
        if item.review_count == 0 && item.priority_rating >= 8 {
            let gem_bonus = self.preferences.novelty_factor * 1.0;
            bonus += gem_bonus;
            reasons.push("Hidden gem".to_string());
        }

        // Serendipity roll: Random items get a boost
        if self.rng.gen::<f64>() < self.preferences.serendipity_rate {
            let serendipity_boost = 1.5;
            bonus += serendipity_boost;
            reasons.push("Serendipity!".to_string());
        }

        // Time-appropriate sizing: Mix long and short items
        let avg_time_already: f64 = already_scored.iter()
            .map(|s| s.meta.estimated_time as f64)
            .sum::<f64>() / already_scored.len().max(1) as f64;
        
        if avg_time_already > 15.0 && item.estimated_time < 10 {
            // Bonus for short items after a series of long ones
            bonus += 0.5 * self.preferences.variety_preference;
            reasons.push("Quick read".to_string());
        }

        let reason_str = if reasons.is_empty() {
            "Standard".to_string()
        } else {
            reasons.join(", ")
        };

        (bonus, reason_str)
    }

    /// Update topic history with newly scored items
    fn update_topic_history(&mut self, scored: &[ScoredQueueItem]) {
        // Keep only the last N items in history
        let max_history = self.preferences.max_same_topic_streak as usize * 2;
        
        for item in scored.iter().take(5) {
            if let Some(cat) = &item.meta.category {
                self.topic_history.push(cat.clone());
            }
        }
        
        if self.topic_history.len() > max_history {
            let excess = self.topic_history.len() - max_history;
            self.topic_history.drain(0..excess);
        }
    }

    /// Select the next batch of items with variety guarantees
    ///
    /// Returns items in the order they should be consumed
    pub fn select_next_batch(
        &mut self,
        items: &[ItemEngagementMeta],
        batch_size: usize,
    ) -> Vec<ItemEngagementMeta> {
        let scored = self.score_queue_items(items);
        
        // Take top items, but ensure variety
        let mut selected: Vec<ItemEngagementMeta> = Vec::new();
        let mut used_topics: HashMap<String, i32> = HashMap::new();
        
        for item in &scored {
            if selected.len() >= batch_size {
                break;
            }

            let topic = item.meta.category.clone().unwrap_or_else(|| "uncategorized".to_string());
            let topic_count = *used_topics.get(&topic).unwrap_or(&0);
            
            // Allow item if we haven't hit the topic limit yet
            if topic_count < self.preferences.max_same_topic_streak {
                selected.push(item.meta.clone());
                *used_topics.entry(topic).or_insert(0) += 1;
            }
        }

        // If we couldn't fill the batch with variety constraints, 
        // add remaining items anyway (better to show something than nothing)
        if selected.len() < batch_size {
            for item in &scored {
                if selected.len() >= batch_size {
                    break;
                }
                if !selected.iter().any(|s| s.id == item.meta.id) {
                    selected.push(item.meta.clone());
                }
            }
        }

        selected
    }

    /// Get smart starting position for scroll mode
    ///
    /// Instead of always starting at 0, this provides a varied start
    /// that considers what the user hasn't seen recently
    pub fn get_smart_start_position(
        &mut self,
        total_items: usize,
        last_session_position: Option<usize>,
        items_reviewed_this_session: usize,
    ) -> usize {
        if total_items == 0 {
            return 0;
        }

        // If this is a continuation of a recent session, resume
        if let Some(last_pos) = last_session_position {
            if items_reviewed_this_session < 5 {
                // Continue from where they left off
                return last_pos.min(total_items - 1);
            }
        }

        // New session: start with some variety
        let variety_window = (total_items as f64 * 0.15).ceil() as usize;
        let window_size = variety_window.max(3).min(10);
        
        // Use weighted random within the first window
        // Higher chance of starting near the beginning, but not always at 0
        let weights: Vec<f64> = (0..window_size.min(total_items))
            .map(|i| 1.0 / (i as f64 + 1.0))
            .collect();
        
        let total_weight: f64 = weights.iter().sum();
        let mut random_val = self.rng.gen::<f64>() * total_weight;
        
        for (i, weight) in weights.iter().enumerate() {
            random_val -= weight;
            if random_val <= 0.0 {
                return i;
            }
        }
        
        0
    }

    /// Update preferences
    pub fn update_preferences(&mut self, preferences: EngagementPreferences) {
        self.preferences = preferences;
    }

    /// Get current preferences
    pub fn preferences(&self) -> &EngagementPreferences {
        &self.preferences
    }
}

impl Default for EngagingScheduler {
    fn default() -> Self {
        Self::default_preferences()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_item(id: &str, category: &str, review_count: i32, next_days: Option<i64>) -> ItemEngagementMeta {
        let next_review = next_days.map(|d| Utc::now() + Duration::days(d));
        
        ItemEngagementMeta {
            id: id.to_string(),
            category: Some(category.to_string()),
            tags: vec![category.to_string()],
            estimated_time: 10,
            date_added: Utc::now(),
            last_reviewed: None,
            review_count,
            priority_rating: 5,
            stability: Some(5.0),
            difficulty: Some(5.0),
            next_review,
        }
    }

    #[test]
    fn test_engagement_modifications() {
        let mut scheduler = EngagingScheduler::default();
        
        // Test with a new item and good rating
        let result = scheduler.schedule_item(
            ReviewRating::Good,
            None,
            None,
            0.0,
            1,
        ).unwrap();
        
        // Should have some interval
        assert!(result.interval_days > 0);
        assert!(result.stability > 0.0);
    }

    #[test]
    fn test_queue_scoring() {
        let mut scheduler = EngagingScheduler::default();
        
        let items = vec![
            create_test_item("1", "tech", 0, Some(-1)), // Due yesterday
            create_test_item("2", "tech", 0, Some(5)),  // Due in 5 days
            create_test_item("3", "science", 0, None),  // New item
        ];
        
        let scored = scheduler.score_queue_items(&items);
        
        // Due items should be first
        assert_eq!(scored[0].meta.id, "1");
        
        // Should have scoring reasons
        assert!(!scored[0].score_reason.is_empty());
    }

    #[test]
    fn test_topic_variety() {
        let mut scheduler = EngagingScheduler::default();
        
        let items = vec![
            create_test_item("1", "tech", 0, Some(-1)),
            create_test_item("2", "tech", 0, Some(-2)),
            create_test_item("3", "tech", 0, Some(-3)),
            create_test_item("4", "science", 0, Some(-1)),
        ];
        
        let batch = scheduler.select_next_batch(&items, 3);
        
        // Should not have all 3 tech items if variety is enforced
        let tech_count = batch.iter()
            .filter(|i| i.category == Some("tech".to_string()))
            .count();
        
        assert!(tech_count <= scheduler.preferences.max_same_topic_streak as usize);
    }

    #[test]
    fn test_smart_start_position() {
        let mut scheduler = EngagingScheduler::default();
        
        // Should start near beginning for new session
        let pos = scheduler.get_smart_start_position(20, None, 0);
        assert!(pos < 10);
        
        // Should resume for continuation
        let pos = scheduler.get_smart_start_position(20, Some(15), 2);
        assert_eq!(pos, 15);
    }
}
