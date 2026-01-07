//! Algorithm commands for Tauri

use crate::algorithms::{
    calculate_priority_score, calculate_review_statistics, compare_algorithms,
    optimizer::{OptimizationParams, OptimizationResult, ParameterOptimizer},
    AlgorithmComparison, DocumentScheduler, SM2Params,
};
use crate::commands::review::RepositoryExt;
use crate::error::Result;
use crate::database::Repository;
use crate::models::{LearningItem, ReviewRating};
use serde::{Deserialize, Serialize};
use tauri::State;

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
pub struct DocumentScheduleRequest {
    pub max_daily_documents: u32,
    pub cards_per_document: u32,
}

/// Document info for scheduling
#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentInfo {
    pub document_id: String,
    pub learning_item_count: i32,
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
        interval: item.interval as f64,
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

/// Schedule documents for incremental reading
#[tauri::command]
pub async fn schedule_documents(
    request: DocumentScheduleRequest,
    repo: State<'_, Repository>,
) -> Result<Vec<String>> {
    // Get all documents with their learning item counts
    let documents = repo.list_documents().await?;

    let mut document_infos: Vec<DocumentInfo> = Vec::new();
    for doc in documents {
        let learning_items = repo.get_learning_items_by_document(&doc.id).await?;
        document_infos.push(DocumentInfo {
            document_id: doc.id,
            learning_item_count: learning_items.len() as i32,
        });
    }

    // Create scheduler and calculate which documents to schedule
    let scheduler = DocumentScheduler {
        max_daily_documents: request.max_daily_documents,
        cards_per_document: request.cards_per_document,
    };

    let scheduled_docs = scheduler.schedule_documents(
        document_infos
            .iter()
            .map(|d| (d.document_id.clone(), d.learning_item_count))
            .collect(),
    );

    Ok(scheduled_docs)
}

/// Calculate priority score for queue items
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
    pub interval: i32,
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
        algorithm: "FSRS-5".to_string(),
        stability,
        difficulty,
        ease_factor: Some(item.ease_factor),
        interval: item.interval,
        review_count: item.review_count,
    })
}

/// Algorithm parameters for an item
#[derive(Debug, Serialize, Deserialize)]
pub struct AlgorithmParams {
    pub algorithm: String,
    pub stability: Option<f32>,
    pub difficulty: Option<f32>,
    pub ease_factor: Option<f64>,
    pub interval: i32,
    pub review_count: i32,
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

/// Optimize algorithm parameters
#[tauri::command]
pub async fn optimize_algorithm_params(
    initial_params: OptimizationParams,
    repo: State<'_, Repository>,
) -> Result<OptimizationResult> {
    // Get all learning items for optimization
    let items = repo.get_all_learning_items().await?;

    // For now, we don't have full review history, so we'll use a simplified approach
    // Create pseudo-history from current item states
    let _history = Vec::new(); // Placeholder - would be populated from review log table

    let optimizer = ParameterOptimizer::new();

    // Run optimization (simplified for now)
    let result = optimizer.optimize_sm2(&_history, initial_params);

    Ok(result)
}
