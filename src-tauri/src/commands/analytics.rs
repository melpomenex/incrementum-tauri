//! Analytics commands for dashboard statistics

use crate::database::Repository;
use tauri::State;
use chrono::{Utc, Duration};
use sqlx::Row;

/// Statistics overview for the dashboard
#[derive(Debug, Clone, serde::Serialize)]
pub struct DashboardStats {
    pub total_cards: i32,
    pub cards_due_today: i32,
    pub cards_learned: i32,
    pub reviews_today: i32,
    pub study_streak: i32,
    pub retention_rate: f64,
    pub average_difficulty: f64,
    pub total_documents: i32,
    pub total_extracts: i32,
}

/// Activity data for a single day
#[derive(Debug, Clone, serde::Serialize)]
pub struct ActivityDay {
    pub date: String,
    pub reviews_count: i32,
    pub cards_learned: i32,
    pub time_spent_minutes: i32,
}

/// Memory statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryStats {
    pub average_stability: f64,
    pub average_difficulty: f64,
    pub mature_cards: i32,
    pub young_cards: i32,
    pub new_cards: i32,
}

/// Category breakdown
#[derive(Debug, Clone, serde::Serialize)]
pub struct CategoryStats {
    pub category: String,
    pub card_count: i32,
    pub reviews_count: i32,
    pub retention_rate: f64,
}

/// Get overall dashboard statistics
#[tauri::command]
pub async fn get_dashboard_stats(
    repo: State<'_, Repository>,
) -> Result<DashboardStats, String> {
    let pool = repo.pool();

    // Get today's date range
    let now = Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc();
    let today_end = now.date_naive().and_hms_opt(23, 59, 59)
        .unwrap()
        .and_utc();

    // Total cards
    let total_cards: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE is_suspended = false"
    )
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // Cards due today
    let cards_due_today: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE due_date <= ? AND is_suspended = false"
    )
    .bind(now)
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // Cards learned (reviewed at least once)
    let cards_learned: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE review_count > 0 AND is_suspended = false"
    )
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // Reviews today (from review count vs last_review_date)
    // This is an approximation - we'll use items reviewed today
    let reviews_today: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE last_review_date >= ? AND last_review_date <= ? AND is_suspended = false"
    )
    .bind(today_start)
    .bind(today_end)
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // Study streak calculation
    let study_streak = calculate_study_streak(pool).await?;

    // Retention rate (cards reviewed with Good/Easy vs total reviews)
    // Approximation: cards with interval > 0 and low lapse rate
    let retention_row: Option<f64> = sqlx::query_scalar(
        "SELECT CAST(COUNT(*) AS REAL) / (SELECT COUNT(*) FROM learning_items WHERE review_count > 0 AND is_suspended = false)
         FROM learning_items WHERE lapses = 0 AND review_count > 0 AND is_suspended = false"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;
    let retention_rate = retention_row.unwrap_or(0.0) * 100.0;

    // Average difficulty
    let avg_diff_row: Option<f64> = sqlx::query_scalar(
        "SELECT AVG(memory_state_difficulty) FROM learning_items WHERE memory_state_difficulty IS NOT NULL AND is_suspended = false"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;
    let average_difficulty = avg_diff_row.unwrap_or(0.0);

    // Total documents
    let total_documents: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM documents"
    )
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // Total extracts
    let total_extracts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM extracts"
    )
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    Ok(DashboardStats {
        total_cards: total_cards as i32,
        cards_due_today: cards_due_today as i32,
        cards_learned: cards_learned as i32,
        reviews_today: reviews_today as i32,
        study_streak,
        retention_rate,
        average_difficulty,
        total_documents: total_documents as i32,
        total_extracts: total_extracts as i32,
    })
}

/// Calculate study streak (consecutive days with reviews)
async fn calculate_study_streak(
    pool: &sqlx::Pool<sqlx::Sqlite>,
) -> Result<i32, String> {
    let mut streak = 0;
    let mut current_date = Utc::now().date_naive();

    // Check if there was any review today
    let today_start = current_date.and_hms_opt(0, 0, 0).unwrap().and_utc();
    let today_end = current_date.and_hms_opt(23, 59, 59).unwrap().and_utc();

    let reviews_today: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE last_review_date >= ? AND last_review_date <= ? AND is_suspended = false"
    )
    .bind(today_start)
    .bind(today_end)
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // If no reviews today, check from yesterday
    if reviews_today == 0 {
        current_date = current_date.pred_opt().unwrap();
    }

    // Count consecutive days backwards
    loop {
        let day_start = current_date.and_hms_opt(0, 0, 0).unwrap().and_utc();
        let day_end = current_date.and_hms_opt(23, 59, 59).unwrap().and_utc();

        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM learning_items WHERE last_review_date >= ? AND last_review_date <= ? AND is_suspended = false"
        )
        .bind(day_start)
        .bind(day_end)
        .fetch_one(pool)
        .await
        .map_err(|e: sqlx::Error| e.to_string())?;

        if count > 0 {
            streak += 1;
            current_date = current_date.pred_opt().unwrap();
        } else {
            break;
        }

        // Safety limit to prevent infinite loops
        if streak > 3650 {
            break;
        }
    }

    Ok(streak)
}

/// Get memory statistics
#[tauri::command]
pub async fn get_memory_stats(
    repo: State<'_, Repository>,
) -> Result<MemoryStats, String> {
    let pool = repo.pool();

    let avg_stability_row: Option<f64> = sqlx::query_scalar(
        "SELECT AVG(memory_state_stability) FROM learning_items WHERE memory_state_stability IS NOT NULL AND is_suspended = false"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;
    let average_stability = avg_stability_row.unwrap_or(0.0);

    let avg_difficulty_row: Option<f64> = sqlx::query_scalar(
        "SELECT AVG(memory_state_difficulty) FROM learning_items WHERE memory_state_difficulty IS NOT NULL AND is_suspended = false"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;
    let average_difficulty = avg_difficulty_row.unwrap_or(0.0);

    // Mature cards: interval >= 21 days
    let mature_cards: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE interval >= 21 AND is_suspended = false"
    )
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // Young cards: reviewed but interval < 21 days
    let young_cards: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE review_count > 0 AND interval < 21 AND is_suspended = false"
    )
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    // New cards: never reviewed
    let new_cards: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM learning_items WHERE review_count = 0 AND is_suspended = false"
    )
    .fetch_one(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    Ok(MemoryStats {
        average_stability,
        average_difficulty,
        mature_cards: mature_cards as i32,
        young_cards: young_cards as i32,
        new_cards: new_cards as i32,
    })
}

/// Get activity data for the last N days
#[tauri::command]
pub async fn get_activity_data(
    days: i32,
    repo: State<'_, Repository>,
) -> Result<Vec<ActivityDay>, String> {
    let pool = repo.pool();
    let mut activities = Vec::new();

    for i in 0..days {
        let date = Utc::now().date_naive() - Duration::days(i as i64);
        let day_start = date.and_hms_opt(0, 0, 0).unwrap().and_utc();
        let day_end = date.and_hms_opt(23, 59, 59).unwrap().and_utc();

        // Reviews count
        let reviews_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM learning_items WHERE last_review_date >= ? AND last_review_date <= ? AND is_suspended = false"
        )
        .bind(day_start)
        .bind(day_end)
        .fetch_one(pool)
        .await
        .map_err(|e: sqlx::Error| e.to_string())?;

        // Cards learned (first review)
        let cards_learned: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM learning_items WHERE last_review_date >= ? AND last_review_date <= ? AND review_count = 1 AND is_suspended = false"
        )
        .bind(day_start)
        .bind(day_end)
        .fetch_one(pool)
        .await
        .map_err(|e: sqlx::Error| e.to_string())?;

        // For time spent, we'd need a reviews log table
        // For now, approximate: 30 seconds per review
        let time_spent_minutes = (reviews_count / 2) as i32;

        activities.push(ActivityDay {
            date: date.to_string(),
            reviews_count: reviews_count as i32,
            cards_learned: cards_learned as i32,
            time_spent_minutes,
        });
    }

    // Reverse to get chronological order
    activities.reverse();
    Ok(activities)
}

/// Get category statistics
#[tauri::command]
pub async fn get_category_stats(
    repo: State<'_, Repository>,
) -> Result<Vec<CategoryStats>, String> {
    let pool = repo.pool();

    let rows = sqlx::query(
        r#"
        SELECT
            COALESCE(e.category, 'Uncategorized') as category,
            COUNT(DISTINCT li.id) as card_count,
            SUM(li.review_count) as reviews_count
        FROM extracts e
        LEFT JOIN learning_items li ON e.id = li.extract_id AND li.is_suspended = false
        GROUP BY e.category
        ORDER BY card_count DESC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    let mut stats = Vec::new();
    for row in rows {
        let category: String = row.try_get("category").unwrap();
        let card_count: i64 = row.try_get("card_count").unwrap();
        let reviews_count: i64 = row.try_get("reviews_count").unwrap();

        // Calculate retention rate for this category
        let retention_row: Option<f64> = sqlx::query_scalar(
            r#"
            SELECT CAST(COUNT(*) AS REAL) / (
                SELECT COUNT(*) FROM learning_items li
                JOIN extracts e ON li.extract_id = e.id
                WHERE COALESCE(e.category, 'Uncategorized') = ? AND li.review_count > 0 AND li.is_suspended = false
            )
            FROM learning_items li
            JOIN extracts e ON li.extract_id = e.id
            WHERE COALESCE(e.category, 'Uncategorized') = ? AND li.lapses = 0 AND li.review_count > 0 AND li.is_suspended = false
            "#
        )
        .bind(&category)
        .bind(&category)
        .fetch_optional(pool)
        .await
        .map_err(|e: sqlx::Error| e.to_string())?;

        let retention_rate = retention_row.unwrap_or(0.0) * 100.0;

        stats.push(CategoryStats {
            category,
            card_count: card_count as i32,
            reviews_count: reviews_count as i32,
            retention_rate,
        });
    }

    Ok(stats)
}
