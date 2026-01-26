//! Reading goals and achievement models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Type of reading goal
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GoalType {
    /// Daily reading time in minutes
    DailyMinutes,
    /// Daily pages read
    DailyPages,
    /// Weekly reading time in minutes
    WeeklyMinutes,
}

impl GoalType {
    pub fn as_str(&self) -> &'static str {
        match self {
            GoalType::DailyMinutes => "daily_minutes",
            GoalType::DailyPages => "daily_pages",
            GoalType::WeeklyMinutes => "weekly_minutes",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "daily_minutes" => Some(GoalType::DailyMinutes),
            "daily_pages" => Some(GoalType::DailyPages),
            "weekly_minutes" => Some(GoalType::WeeklyMinutes),
            _ => None,
        }
    }
}

/// Reading goal configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingGoal {
    pub id: String,
    pub goal_type: GoalType,
    pub target_value: u32, // minutes or pages depending on type
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl ReadingGoal {
    pub fn new(goal_type: GoalType, target_value: u32) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            goal_type,
            target_value,
            is_active: true,
            created_at: now,
            modified_at: now,
        }
    }

    /// Create a daily minutes goal
    pub fn daily_minutes(target_minutes: u32) -> Self {
        Self::new(GoalType::DailyMinutes, target_minutes)
    }

    /// Create a daily pages goal
    pub fn daily_pages(target_pages: u32) -> Self {
        Self::new(GoalType::DailyPages, target_pages)
    }

    /// Create a weekly minutes goal
    pub fn weekly_minutes(target_minutes: u32) -> Self {
        Self::new(GoalType::WeeklyMinutes, target_minutes)
    }
}

/// Progress tracking for a specific goal on a specific date
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalProgress {
    pub id: String,
    pub goal_id: String,
    pub date: String, // YYYY-MM-DD format
    pub current_value: f32, // Actual progress (minutes read or pages read)
    pub is_completed: bool,
    pub updated_at: DateTime<Utc>,
}

impl GoalProgress {
    pub fn new(goal_id: String, date: String) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            goal_id,
            date,
            current_value: 0.0,
            is_completed: false,
            updated_at: now,
        }
    }

    /// Calculate completion percentage
    pub fn completion_percentage(&self, target: u32) -> f32 {
        if target == 0 {
            0.0
        } else {
            (self.current_value / target as f32) * 100.0
        }
    }
}

/// Achievement unlocked by the user
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Achievement {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub category: AchievementCategory,
    pub unlocked_at: DateTime<Utc>,
}

/// Category of achievement
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AchievementCategory {
    /// Daily/weekly goal achievements
    Goals,
    /// Reading streak achievements
    Streaks,
    /// Milestone achievements (total documents read, etc.)
    Milestones,
    /// Special event achievements
    Special,
}

/// Reading streak information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingStreak {
    /// Current active streak length in days
    pub current_streak: u32,
    /// Longest streak ever achieved
    pub longest_streak: u32,
    /// Date of last reading activity
    pub last_activity_date: Option<String>,
    /// Whether streak is currently active (no gaps)
    pub is_active: bool,
}

impl ReadingStreak {
    pub fn new() -> Self {
        Self {
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: None,
            is_active: false,
        }
    }

    /// Update streak based on new activity
    pub fn update_activity(&mut self, activity_date: String) {
        let today = chrono::Utc::now().date_naive().to_string();

        if let Some(last_date) = &self.last_activity_date {
            // Check if this is consecutive day
            if let Ok(last) = chrono::NaiveDate::parse_from_str(last_date, "%Y-%m-%d") {
                if let Ok(current) = chrono::NaiveDate::parse_from_str(&activity_date, "%Y-%m-%d") {
                    let days_diff = (current - last).num_days();

                    if days_diff == 0 {
                        // Same day, no change
                        return;
                    } else if days_diff == 1 {
                        // Consecutive day, increment streak
                        self.current_streak += 1;
                        if self.current_streak > self.longest_streak {
                            self.longest_streak = self.current_streak;
                        }
                    } else {
                        // Gap detected, reset streak
                        self.current_streak = 1;
                    }
                }
            }
        } else {
            // First activity
            self.current_streak = 1;
            self.longest_streak = 1;
        }

        self.last_activity_date = Some(activity_date);
        self.is_active = true;
    }

    /// Reset streak (called when a day is missed)
    pub fn reset(&mut self) {
        self.current_streak = 0;
        self.is_active = false;
    }
}

/// Achievement definitions
impl Achievement {
    /// First goal completed achievement
    pub fn first_goal() -> Achievement {
        let now = Utc::now();
        Achievement {
            id: uuid::Uuid::new_v4().to_string(),
            name: "First Step".to_string(),
            description: "Complete your first daily reading goal".to_string(),
            icon: "🎯".to_string(),
            category: AchievementCategory::Goals,
            unlocked_at: now,
        }
    }

    /// Week warrior achievement (7 day streak)
    pub fn week_warrior() -> Achievement {
        let now = Utc::now();
        Achievement {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Week Warrior".to_string(),
            description: "Maintain a 7-day reading streak".to_string(),
            icon: "🔥".to_string(),
            category: AchievementCategory::Streaks,
            unlocked_at: now,
        }
    }

    /// Monthly master achievement (30 day streak)
    pub fn monthly_master() -> Achievement {
        let now = Utc::now();
        Achievement {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Monthly Master".to_string(),
            description: "Maintain a 30-day reading streak".to_string(),
            icon: "⚡".to_string(),
            category: AchievementCategory::Streaks,
            unlocked_at: now,
        }
    }

    /// Century club achievement (100 day streak)
    pub fn century_club() -> Achievement {
        let now = Utc::now();
        Achievement {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Century Club".to_string(),
            description: "Maintain a 100-day reading streak".to_string(),
            icon: "💎".to_string(),
            category: AchievementCategory::Streaks,
            unlocked_at: now,
        }
    }
}
