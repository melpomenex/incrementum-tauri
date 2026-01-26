//! Reading goals and streaks service

use crate::models::reading_goal::{
    Achievement, GoalProgress, GoalType, ReadingGoal, ReadingStreak,
};
use chrono::{Utc, NaiveDate};
use std::sync::Arc;

pub struct ReadingGoalService {
    // TODO: Add database pool/repository reference
}

impl ReadingGoalService {
    pub fn new() -> Self {
        Self {}
    }

    /// Create a new reading goal
    pub fn create_goal(
        &self,
        goal_type: GoalType,
        target_value: u32,
    ) -> Result<ReadingGoal, String> {
        let goal = ReadingGoal::new(goal_type, target_value);
        // TODO: Save to database
        Ok(goal)
    }

    /// Get the active reading goal for a user
    pub fn get_active_goal(&self) -> Result<Option<ReadingGoal>, String> {
        // TODO: Fetch from database
        Ok(None)
    }

    /// Update a reading goal
    pub fn update_goal(
        &self,
        _goal_id: &str,
        target_value: u32,
        is_active: bool,
    ) -> Result<ReadingGoal, String> {
        // TODO: Update in database
        Err("Not implemented".to_string())
    }

    /// Get progress for a specific goal on a specific date
    pub fn get_progress(&self, _goal_id: &str, _date: &str) -> Result<GoalProgress, String> {
        // TODO: Fetch from database
        Err("Not implemented".to_string())
    }

    /// Update progress for a goal and check if completed
    pub fn update_progress(
        &self,
        goal_id: &str,
        date: &str,
        current_value: f32,
    ) -> Result<GoalProgress, String> {
        // TODO: Update progress in database
        // TODO: Check if goal is completed and unlock achievement
        let mut progress = GoalProgress::new(goal_id.to_string(), date.to_string());
        progress.current_value = current_value;
        progress.is_completed = false; // Will be calculated based on target
        Ok(progress)
    }

    /// Get current reading streak
    pub fn get_streak(&self) -> Result<ReadingStreak, String> {
        // TODO: Calculate from reading sessions in database
        Ok(ReadingStreak::new())
    }

    /// Update streak after a reading session
    pub fn update_streak(&self, activity_date: String) -> Result<ReadingStreak, String> {
        // TODO: Update streak in database
        let mut streak = ReadingStreak::new();
        streak.update_activity(activity_date);
        Ok(streak)
    }

    /// Get all unlocked achievements
    pub fn get_achievements(&self) -> Result<Vec<Achievement>, String> {
        // TODO: Fetch from database
        Ok(vec![])
    }

    /// Check and unlock achievements based on streaks and goals
    pub fn check_achievements(&self) -> Result<Vec<Achievement>, String> {
        let mut new_achievements = vec![];
        let streak = self.get_streak()?;

        // Check streak milestones
        if streak.current_streak >= 7 && streak.current_streak < 30 {
            // TODO: Check if already unlocked
            new_achievements.push(Achievement::week_warrior());
        } else if streak.current_streak >= 30 && streak.current_streak < 100 {
            new_achievements.push(Achievement::monthly_master());
        } else if streak.current_streak >= 100 {
            new_achievements.push(Achievement::century_club());
        }

        // TODO: Save new achievements to database
        Ok(new_achievements)
    }

    /// Get today's reading progress (sum of all sessions today)
    pub fn get_today_progress(&self, goal_type: GoalType) -> Result<f32, String> {
        // TODO: Calculate from reading sessions
        match goal_type {
            GoalType::DailyMinutes | GoalType::WeeklyMinutes => Ok(0.0),
            GoalType::DailyPages => Ok(0.0),
        }
    }

    /// Get this week's reading progress
    pub fn get_week_progress(&self) -> Result<f32, String> {
        // TODO: Calculate from reading sessions
        Ok(0.0)
    }
}

impl Default for ReadingGoalService {
    fn default() -> Self {
        Self::new()
    }
}
