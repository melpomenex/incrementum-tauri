//! Reading goals and streaks commands

use crate::models::reading_goal::{
    Achievement, GoalProgress, GoalType, ReadingGoal, ReadingStreak,
};

#[tauri::command]
pub async fn create_reading_goal(
    goal_type: String,
    target_value: u32,
) -> Result<ReadingGoal, String> {
    let goal_type_enum = GoalType::from_str(&goal_type)
        .ok_or_else(|| format!("Invalid goal type: {}", goal_type))?;

    let goal = ReadingGoal::new(goal_type_enum, target_value);

    // TODO: Save to database via repository
    Ok(goal)
}

#[tauri::command]
pub async fn get_active_reading_goal() -> Result<Option<ReadingGoal>, String> {
    // TODO: Fetch from database
    Ok(None)
}

#[tauri::command]
pub async fn update_reading_goal(
    goal_id: String,
    target_value: u32,
    is_active: bool,
) -> Result<ReadingGoal, String> {
    // TODO: Update in database
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn get_goal_progress(goal_id: String, date: String) -> Result<GoalProgress, String> {
    // TODO: Fetch from database
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn update_goal_progress(
    goal_id: String,
    date: String,
    current_value: f32,
) -> Result<GoalProgress, String> {
    // TODO: Update in database and check if goal is completed
    // TODO: Unlock achievement if goal is completed
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn get_reading_streak() -> Result<ReadingStreak, String> {
    // TODO: Calculate from reading sessions
    Ok(ReadingStreak::new())
}

#[tauri::command]
pub async fn get_achievements() -> Result<Vec<Achievement>, String> {
    // TODO: Fetch from database
    Ok(vec![])
}

#[tauri::command]
pub async fn check_and_unlock_achievements() -> Result<Vec<Achievement>, String> {
    // TODO: Check streak milestones and goal completions
    // Return any newly unlocked achievements
    Ok(vec![])
}
