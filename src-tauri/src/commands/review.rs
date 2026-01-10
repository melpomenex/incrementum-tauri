//! Review commands using FSRS algorithm

use tauri::State;
use chrono::{Utc, Duration, Datelike, Timelike};
use crate::database::Repository;
use crate::error::Result;
use crate::models::{LearningItem, ReviewRating, MemoryState, ItemState};

/// Desired retention rate (0.9 = 90% retention)
const DESIRED_RETENTION: f32 = 0.9;

/// Graduation interval in days - items with intervals >= this are considered "graduated" to Review state
const GRADUATION_INTERVAL_DAYS: f64 = 1.0;

#[derive(Clone, serde::Serialize)]
pub struct ReviewStreak {
    pub current_streak: i32,
    pub longest_streak: i32,
    pub total_reviews: i32,
    pub last_review_date: Option<String>,
}

#[tauri::command]
pub async fn get_review_streak(
    repo: State<'_, Repository>,
) -> Result<ReviewStreak> {
    let items = repo.get_all_learning_items().await?;

    // Group reviews by date
    let mut review_dates: Vec<String> = Vec::new();
    for item in &items {
        if let Some(lr) = &item.last_review_date {
            review_dates.push(lr.format("%Y-%m-%d").to_string());
        }
    }

    // Get unique dates and sort
    review_dates.sort();
    review_dates.dedup();

    let total_reviews = items.iter().map(|i| i.review_count).sum::<i32>();
    let last_review_date = items.iter()
        .filter_map(|i| i.last_review_date.as_ref())
        .max()
        .map(|d| d.format("%Y-%m-%d").to_string());

    // Calculate current streak
    let current_streak = calculate_current_streak(&review_dates);
    let longest_streak = calculate_longest_streak(&review_dates);

    Ok(ReviewStreak {
        current_streak,
        longest_streak,
        total_reviews,
        last_review_date,
    })
}

fn calculate_current_streak(dates: &[String]) -> i32 {
    if dates.is_empty() {
        return 0;
    }

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let yesterday = (Utc::now() - Duration::days(1)).format("%Y-%m-%d").to_string();

    // Check if the most recent review was today or yesterday
    let last_date = dates.last().unwrap();
    if last_date != &today && last_date != &yesterday {
        return 0;
    }

    let mut streak = 1;
    for i in (0..dates.len() - 1).rev() {
        let current = chrono::NaiveDate::parse_from_str(&dates[i + 1], "%Y-%m-%d").unwrap();
        let prev = chrono::NaiveDate::parse_from_str(&dates[i], "%Y-%m-%d").unwrap();

        if current.signed_duration_since(prev).num_days() == 1 {
            streak += 1;
        } else {
            break;
        }
    }

    streak
}

fn calculate_longest_streak(dates: &[String]) -> i32 {
    if dates.len() <= 1 {
        return dates.len() as i32;
    }

    let mut longest = 1;
    let mut current = 1;

    for i in 1..dates.len() {
        let curr_date = chrono::NaiveDate::parse_from_str(&dates[i], "%Y-%m-%d").unwrap();
        let prev_date = chrono::NaiveDate::parse_from_str(&dates[i - 1], "%Y-%m-%d").unwrap();

        if curr_date.signed_duration_since(prev_date).num_days() == 1 {
            current += 1;
            longest = longest.max(current);
        } else {
            current = 1;
        }
    }

    longest
}

#[tauri::command]
pub async fn start_review(
    repo: State<'_, Repository>,
) -> Result<String> {
    // Get all due items
    let now = Utc::now();
    let due_items = repo.get_due_learning_items(&now).await?;

    if due_items.is_empty() {
        return Ok(String::new()); // No session needed if no items
    }

    // Create a session ID
    let session_id = uuid::Uuid::new_v4().to_string();

    // TODO: Create a review session in the database
    // For now, we just return the session ID
    Ok(session_id)
}

#[tauri::command]
pub async fn submit_review(
    item_id: String,
    rating: i32,
    time_taken: i32,
    repo: State<'_, Repository>,
) -> Result<LearningItem> {
    apply_fsrs_review(&*repo, &item_id, rating, time_taken).await
}

pub async fn apply_fsrs_review(
    repo: &Repository,
    item_id: &str,
    rating: i32,
    _time_taken: i32,
) -> Result<LearningItem> {
    // Get the current item
    let mut item = repo.get_learning_item(item_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Learning item {}", item_id)))?;

    // Convert rating to ReviewRating
    let review_rating = ReviewRating::from(rating);

    // Create FSRS instance with default parameters
    let fsrs = fsrs::FSRS::new(None)?;

    // Calculate elapsed time since last review (in days, can be fractional)
    let now = Utc::now();
    let elapsed_days = item.last_review_date
        .map(|lr| {
            let duration = now - lr;
            duration.num_seconds() as f64 / 86400.0 // Convert seconds to fractional days
        })
        .unwrap_or(0.0)
        .max(0.0) as u32;

    // Get current memory state or use default for new items
    let current_memory_state = item.memory_state.clone().map(|ms| fsrs::MemoryState {
        stability: ms.stability as f32,
        difficulty: ms.difficulty as f32,
    });

    // Calculate next states using FSRS 5.2
    let next_states = fsrs.next_states(current_memory_state, DESIRED_RETENTION, elapsed_days)?;

    // Select the next state based on rating
    let next_state = match review_rating {
        ReviewRating::Again => &next_states.again,
        ReviewRating::Hard => &next_states.hard,
        ReviewRating::Good => &next_states.good,
        ReviewRating::Easy => &next_states.easy,
    };

    // Use the exact interval from FSRS 5.2 (fractional days supported)
    let new_interval = next_state.interval as f64;

    // Calculate due date with sub-day precision
    // Convert fractional days to seconds for precision
    let interval_seconds = (new_interval * 86400.0).round() as i64;
    item.due_date = now + Duration::seconds(interval_seconds);

    // Update the item
    item.review_count += 1;
    item.interval = new_interval;
    item.last_review_date = Some(now);
    item.date_modified = now;

    // Update memory state from FSRS
    item.memory_state = Some(MemoryState {
        stability: next_state.memory.stability as f64,
        difficulty: next_state.memory.difficulty as f64,
    });

    // Update state based on review rating and interval (FSRS 5.2 alignment)
    // Items stay in Learning/Relearning until they "graduate" with longer intervals
    item.state = match review_rating {
        ReviewRating::Again => {
            item.lapses += 1;
            // "Again" always sends to Relearning (or stays there)
            ItemState::Relearning
        }
        ReviewRating::Hard | ReviewRating::Good | ReviewRating::Easy => {
            // Graduate to Review state only when interval is long enough
            if new_interval >= GRADUATION_INTERVAL_DAYS {
                ItemState::Review
            } else {
                // Stay in learning phase for short intervals
                match item.state {
                    ItemState::New => ItemState::Learning,
                    ItemState::Relearning => ItemState::Relearning,
                    _ => ItemState::Learning,
                }
            }
        }
    };

    // Save the updated item
    repo.update_learning_item(&item).await?;

    Ok(item)
}

// Helper function to get a single learning item (needed for submit_review)
pub trait RepositoryExt {
    async fn get_learning_item(&self, id: &str) -> Result<Option<LearningItem>>;
}

impl RepositoryExt for Repository {
    async fn get_learning_item(&self, id: &str) -> Result<Option<LearningItem>> {
        // Use get_all_learning_items and filter by id
        // This is inefficient but works for now
        let items = self.get_all_learning_items().await?;
        Ok(items.into_iter().find(|item| item.id == id))
    }
}

/// Get the next scheduled review time for all items (for queue display)
#[tauri::command]
pub async fn get_next_review_times(
    repo: State<'_, Repository>,
) -> Result<Vec<String>> {
    let items = repo.get_all_learning_items().await?;
    let now = Utc::now();

    let due_times: Vec<String> = items.iter()
        .filter(|item| !item.is_suspended)
        .map(|item| {
            if item.due_date <= now {
                "Now".to_string()
            } else {
                let duration = item.due_date - now;
                let hours = duration.num_hours();
                if hours < 24 {
                    format!("{}h", hours)
                } else {
                    format!("{}d", duration.num_days())
                }
            }
        })
        .collect();

    Ok(due_times)
}

/// Calculate FSRS parameters for preview (show user what will happen with each rating)
#[tauri::command]
pub async fn preview_review_intervals(
    item_id: String,
    repo: State<'_, Repository>,
) -> Result<PreviewIntervals> {
    let item = repo.get_learning_item(&item_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Learning item {}", item_id)))?;

    let fsrs = fsrs::FSRS::new(None)?;
    let now = Utc::now();

    // Calculate elapsed days with fractional precision
    let elapsed_days = item.last_review_date
        .map(|lr| {
            let duration = now - lr;
            duration.num_seconds() as f64 / 86400.0
        })
        .unwrap_or(0.0)
        .max(0.0) as u32;

    let current_memory_state = item.memory_state.clone().map(|ms| fsrs::MemoryState {
        stability: ms.stability as f32,
        difficulty: ms.difficulty as f32,
    });

    let next_states = fsrs.next_states(current_memory_state, DESIRED_RETENTION, elapsed_days)?;

    Ok(PreviewIntervals {
        again: next_states.again.interval as f64,
        hard: next_states.hard.interval as f64,
        good: next_states.good.interval as f64,
        easy: next_states.easy.interval as f64,
    })
}

#[derive(serde::Serialize)]
pub struct PreviewIntervals {
    /// Intervals in days (can be fractional for learning items)
    pub again: f64,
    pub hard: f64,
    pub good: f64,
    pub easy: f64,
}
