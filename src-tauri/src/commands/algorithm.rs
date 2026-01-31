//! Algorithm commands for Tauri

use crate::algorithms::{
    calculate_priority_score, calculate_review_statistics, compare_algorithms,
    optimizer::{OptimizationParams, OptimizationResult, ParameterOptimizer},
    DocumentScheduler as DocScheduler,
    IncrementalScheduler,
    EngagingScheduler, EngagementPreferences,
    AlgorithmComparison, SM2Params,
};
use crate::commands::review::RepositoryExt;
use crate::error::Result;
use crate::database::Repository;
use crate::models::ReviewRating;
use serde::{Deserialize, Serialize};
use tauri::State;
use chrono::Utc;

/// SM-2 calculation parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SM2Calculation {
    pub ease_factor: f64,
    pub interval: f64,
    pub repetitions: u32,
    pub next_review_date: String,
}

/// Document scheduling request
#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentRatingRequest {
    pub document_id: String,
    pub rating: i32, // 1-4 scale (ReviewRating)
    pub time_taken: Option<i32>, // seconds
}

/// Document scheduling response
#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentRatingResponse {
    pub next_review_date: String,
    pub stability: f64,
    pub difficulty: f64,
    pub interval_days: i64,
    pub scheduling_reason: String,
}

/// Extract rating request
#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractRatingRequest {
    pub extract_id: String,
    pub rating: i32, // 1-4 scale (ReviewRating)
    pub time_taken: Option<i32>, // seconds
}

/// Extract rating response
#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractRatingResponse {
    pub next_review_date: String,
    pub stability: f64,
    pub difficulty: f64,
    pub interval_days: i64,
    pub scheduling_reason: String,
}

/// Algorithm type selection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlgorithmType {
    Fsrs,
    SM2,
}

/// Calculate next review state using SM-2 algorithm
#[tauri::command]
pub async fn calculate_sm2_next(
    item_id: String,
    rating: ReviewRating,
    repo: State<'_, Repository>,
) -> Result<SM2Calculation> {
    let item = repo.get_learning_item(&item_id).await?.ok_or_else(|| {
        crate::error::IncrementumError::NotFound(format!("Learning item {} not found", item_id))
    })?;

    // Get current SM-2 params (or use defaults)
    let current_params = SM2Params {
        ease_factor: item.ease_factor,
        interval: item.interval,
        repetitions: item.review_count as u32,
    };

    // Calculate next state
    let next_params = current_params.next_interval(rating);
    let next_review_date = next_params.next_review_date();

    Ok(SM2Calculation {
        ease_factor: next_params.ease_factor,
        interval: next_params.interval,
        repetitions: next_params.repetitions,
        next_review_date: next_review_date.to_rfc3339(),
    })
}

/// Rate a document and schedule its next reading
///
/// This uses the incremental reading scheduler for documents and videos,
/// which is optimized for keeping content in regular rotation rather than
/// maximizing long-term retention (which is what FSRS does for flashcards).
#[tauri::command]
pub async fn rate_document(
    request: DocumentRatingRequest,
    repo: State<'_, Repository>,
) -> Result<DocumentRatingResponse> {
    // Get the document
    let document = repo.get_document(&request.document_id).await?.ok_or_else(|| {
        crate::error::IncrementumError::NotFound(format!("Document {} not found", request.document_id))
    })?;

    // Create incremental scheduler (optimized for documents/videos)
    let scheduler = IncrementalScheduler::default_params();

    let review_rating = ReviewRating::from(request.rating);

    // Get consecutive count (defaults to 0 if not set)
    let consecutive_count = document.consecutive_count.unwrap_or(0);

    // Split into consecutive good and hard counts
    let (consecutive_good_count, consecutive_hard_count) = if consecutive_count > 0 {
        (consecutive_count, 0)
    } else {
        (0, -consecutive_count)
    };

    // Get current interval days (if any)
    let current_interval_days = document.stability.map(|s| s as i64);

    // Schedule the document using the incremental scheduler
    let result = scheduler.schedule_item(
        review_rating,
        current_interval_days,
        consecutive_good_count,
        consecutive_hard_count,
    );

    // Update the document with new scheduling data
    let new_reps = document.reps.unwrap_or(0) + 1;
    let new_time_spent = document.total_time_spent.unwrap_or(0) + request.time_taken.unwrap_or(0);

    repo.update_document_scheduling_with_consecutive(
        &document.id,
        Some(result.next_review),
        Some(result.stability),
        Some(result.difficulty),
        Some(new_reps),
        Some(new_time_spent),
        Some(result.consecutive_count),
    ).await?;

    Ok(DocumentRatingResponse {
        next_review_date: result.next_review.to_rfc3339(),
        stability: result.stability,
        difficulty: result.difficulty,
        interval_days: result.interval_days,
        scheduling_reason: result.scheduling_reason,
    })
}

/// Rate a document using the Engaging FSRS-6 scheduler
///
/// This scheduler extends FSRS-6 with engagement features:
/// - Novelty injection for discovery
/// - Serendipity factor for surprises
/// - Streak-friendly scheduling
#[tauri::command]
pub async fn rate_document_engaging(
    request: DocumentRatingRequest,
    repo: State<'_, Repository>,
) -> Result<DocumentRatingResponse> {
    // Get the document
    let document = repo.get_document(&request.document_id).await?.ok_or_else(|| {
        crate::error::IncrementumError::NotFound(format!("Document {} not found", request.document_id))
    })?;

    // Create engaging scheduler with default preferences
    // TODO: Load user preferences from settings
    let preferences = EngagementPreferences::default();
    let mut scheduler = EngagingScheduler::new(preferences);

    let review_rating = ReviewRating::from(request.rating);

    // Get current FSRS state from document
    let current_stability = document.stability;
    let current_difficulty = document.difficulty;
    
    // Calculate elapsed days since last review
    let elapsed_days = document.date_last_reviewed
        .map(|lr| (Utc::now() - lr).num_seconds() as f64 / 86400.0)
        .unwrap_or(0.0)
        .max(0.0);

    let review_count = document.reps.unwrap_or(0);

    // Schedule using engaging FSRS-6
    let result = scheduler.schedule_item(
        review_rating,
        current_stability,
        current_difficulty,
        elapsed_days,
        review_count,
    )?;

    // Update the document with new scheduling data
    let new_reps = review_count + 1;
    let new_time_spent = document.total_time_spent.unwrap_or(0) + request.time_taken.unwrap_or(0);

    // Map consecutive count: positive for good streak, negative for hard streak
    let consecutive_count = if result.engagement_modifier < 1.0 {
        -((result.engagement_modifier * 10.0) as i32).min(5)
    } else {
        ((result.engagement_modifier - 1.0) * 10.0) as i32
    };

    repo.update_document_scheduling_with_consecutive(
        &document.id,
        Some(result.next_review),
        Some(result.stability),
        Some(result.difficulty),
        Some(new_reps),
        Some(new_time_spent),
        Some(consecutive_count),
    ).await?;

    Ok(DocumentRatingResponse {
        next_review_date: result.next_review.to_rfc3339(),
        stability: result.stability,
        difficulty: result.difficulty,
        interval_days: result.interval_days,
        scheduling_reason: result.scheduling_reason,
    })
}

/// Rate an extract and schedule its next review
///
/// This implements FSRS-based scheduling for extracts.
#[tauri::command]
pub async fn rate_extract(
    request: ExtractRatingRequest,
    repo: State<'_, Repository>,
) -> Result<ExtractRatingResponse> {
    // Get the extract
    let extract = repo.get_extract(&request.extract_id).await?.ok_or_else(|| {
        crate::error::IncrementumError::NotFound(format!("Extract {} not found", request.extract_id))
    })?;

    // Create document scheduler (FSRS works the same for extracts)
    let scheduler = DocScheduler::default_params();
    let now = Utc::now();

    // Calculate elapsed days since last review
    let elapsed_days = extract.last_review_date
        .map(|lr| (now - lr).num_seconds() as f64 / 86400.0)
        .unwrap_or_else(|| {
            // For new extracts, use days since creation
            (now - extract.date_created).num_seconds() as f64 / 86400.0
        })
        .max(0.0);

    let review_rating = ReviewRating::from(request.rating);

    // Get current stability and difficulty from memory state
    let current_stability = extract.memory_state.as_ref().map(|ms| ms.stability);
    let current_difficulty = extract.memory_state.as_ref().map(|ms| ms.difficulty);

    // Schedule the extract using FSRS
    let result = scheduler.schedule_document(
        review_rating,
        current_stability,
        current_difficulty,
        elapsed_days
    )?;

    // Update the extract with new scheduling data
    let new_review_count = extract.review_count + 1;
    let new_reps = extract.reps + 1;
    let last_review = Some(now);

    repo.update_extract_scheduling(
        &extract.id,
        Some(result.next_review),
        Some(result.stability),
        Some(result.difficulty),
        Some(new_review_count),
        Some(new_reps),
        last_review,
    ).await?;

    Ok(ExtractRatingResponse {
        next_review_date: result.next_review.to_rfc3339(),
        stability: result.stability,
        difficulty: result.difficulty,
        interval_days: result.interval_days,
        scheduling_reason: result.scheduling_reason,
    })
}

/// Calculate priority scores for queue items
#[tauri::command]
pub async fn calculate_priority_scores(
    repo: State<'_, Repository>,
) -> Result<Vec<PriorityScoreItem>> {
    let items = repo.get_all_learning_items().await?;

    let mut scored_items = Vec::new();
    for item in items {
        let due_date = item.due_date;
        // Get difficulty from memory state if available, otherwise use default
        let difficulty = item
            .memory_state
            .as_ref()
            .map(|ms| ms.difficulty)
            .unwrap_or(5.0);

        let score = calculate_priority_score(
            due_date,
            item.interval,
            item.review_count,
            difficulty,
        );

        scored_items.push(PriorityScoreItem {
            item_id: item.id,
            priority_score: score,
            due_date: due_date.to_rfc3339(),
            interval: item.interval,
            review_count: item.review_count,
            difficulty,
        });
    }

    // Sort by priority score (highest first)
    scored_items.sort_by(|a, b| b.priority_score.partial_cmp(&a.priority_score).unwrap());

    Ok(scored_items)
}

/// Item with priority score
#[derive(Debug, Serialize, Deserialize)]
pub struct PriorityScoreItem {
    pub item_id: String,
    pub priority_score: f64,
    pub due_date: String,
    pub interval: f64,
    pub review_count: i32,
    pub difficulty: f64,
}

/// Compare algorithm performance
#[tauri::command]
pub async fn compare_algorithms_command(
    repo: State<'_, Repository>,
) -> Result<AlgorithmComparison> {
    let items = repo.get_all_learning_items().await?;
    Ok(compare_algorithms(&items))
}

/// Algorithm type selection
#[derive(Debug, Serialize, Deserialize)]
pub struct AlgorithmParams {
    pub algorithm: String,
    pub stability: Option<f32>,
    pub difficulty: Option<f32>,
    pub ease_factor: Option<f64>,
    pub interval: f64,
    pub review_count: i32,
}

/// Get algorithm parameters for an item
#[tauri::command]
pub async fn get_algorithm_params(
    item_id: String,
    repo: State<'_, Repository>,
) -> Result<AlgorithmParams> {
    let item = repo.get_learning_item(&item_id).await?.ok_or_else(|| {
        crate::error::IncrementumError::NotFound(format!("Learning item {} not found", item_id))
    })?;

    // Get stability and difficulty from memory state
    let (stability, difficulty) = item
        .memory_state
        .as_ref()
        .map(|ms| (Some(ms.stability as f32), Some(ms.difficulty as f32)))
        .unwrap_or((None, None));

    Ok(AlgorithmParams {
        algorithm: "FSRS-6".to_string(),
        stability,
        difficulty,
        ease_factor: Some(item.ease_factor),
        interval: item.interval,
        review_count: item.review_count,
    })
}

/// Review statistics output
#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewStatisticsOutput {
    pub total_items: i32,
    pub total_reviews: i32,
    pub total_lapses: i32,
    pub avg_interval: f64,
    pub retention_estimate: f64,
    pub due_today: i32,
    pub due_week: i32,
    pub due_month: i32,
}

/// Get review statistics for all items
#[tauri::command]
pub async fn get_review_statistics(
    repo: State<'_, Repository>,
) -> Result<ReviewStatisticsOutput> {
    let items = repo.get_all_learning_items().await?;
    let stats = calculate_review_statistics(&items);

    Ok(ReviewStatisticsOutput {
        total_items: stats.total_items,
        total_reviews: stats.total_reviews,
        total_lapses: stats.total_lapses,
        avg_interval: stats.avg_interval,
        retention_estimate: stats.retention_estimate,
        due_today: stats.due_today,
        due_week: stats.due_week,
        due_month: stats.due_month,
    })
}

/// Optimize algorithm parameters
#[tauri::command]
pub async fn optimize_algorithm_params(
    initial_params: OptimizationParams,
    repo: State<'_, Repository>,
) -> Result<OptimizationResult> {
    // Get all learning items for optimization
    let _items = repo.get_all_learning_items().await?;

    // For now, we don't have full review history, so we'll use a simplified approach
    // Create pseudo-history from current item states
    let _history = Vec::new(); // Placeholder - would be populated from review log table

    let optimizer = ParameterOptimizer::new();

    // Run optimization (simplified for now)
    let result = optimizer.optimize_sm2(&_history, initial_params);

    Ok(result)
}

/// Engagement preferences for scroll mode
#[derive(Debug, Serialize, Deserialize)]
pub struct EngagementPreferencesInput {
    pub novelty_factor: Option<f64>,
    pub serendipity_rate: Option<f64>,
    pub variety_preference: Option<f64>,
    pub max_same_topic_streak: Option<i32>,
    pub favor_recent_additions: Option<bool>,
    pub recent_window_hours: Option<i64>,
}

/// Get default engagement preferences
#[tauri::command]
pub async fn get_default_engagement_preferences() -> Result<EngagementPreferences> {
    Ok(EngagementPreferences::default())
}

/// Smart start position request
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartStartRequest {
    pub total_items: usize,
    pub last_session_position: Option<usize>,
    pub items_reviewed_this_session: usize,
    pub seed: Option<u64>,
}

/// Smart start position response
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartStartResponse {
    pub start_position: usize,
    pub is_resuming: bool,
    pub reason: String,
}

/// Get smart starting position for scroll mode
///
/// Returns a varied starting position that considers session continuity
/// and user engagement patterns
#[tauri::command]
pub async fn get_smart_start_position(
    request: SmartStartRequest,
) -> Result<SmartStartResponse> {
    let preferences = EngagementPreferences::default();
    let mut scheduler = match request.seed {
        Some(seed) => EngagingScheduler::new(preferences).with_seed(seed),
        None => EngagingScheduler::new(preferences),
    };

    let start_position = scheduler.get_smart_start_position(
        request.total_items,
        request.last_session_position,
        request.items_reviewed_this_session,
    );

    let (is_resuming, reason) = if let Some(last_pos) = request.last_session_position {
        if request.items_reviewed_this_session < 5 && start_position == last_pos {
            (true, "Resuming previous session".to_string())
        } else {
            (false, "New session with variety".to_string())
        }
    } else {
        (false, "Fresh start with engagement mix".to_string())
    };

    Ok(SmartStartResponse {
        start_position,
        is_resuming,
        reason,
    })
}
