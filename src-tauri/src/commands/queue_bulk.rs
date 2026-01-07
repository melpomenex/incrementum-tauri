//! Advanced queue management commands

use tauri::State;
use crate::database::Repository;
use crate::error::Result;
use crate::models::LearningItem;
use chrono::{Utc, Duration};
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Serialize, Deserialize)]
pub struct QueueStats {
    pub total_items: i32,
    pub due_today: i32,
    pub overdue: i32,
    pub new_items: i32,
    pub learning_items: i32,
    pub review_items: i32,
    pub total_estimated_time: i32, // in minutes
    pub suspended: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkOperationResult {
    pub succeeded: Vec<String>,
    pub failed: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueueExportItem {
    pub id: String,
    pub document_title: String,
    pub item_type: String,
    pub question: String,
    pub answer: Option<String>,
    pub due_date: String,
    pub state: String,
    pub interval: i32,
    pub tags: Vec<String>,
    pub category: Option<String>,
}

/// Get queue statistics
#[tauri::command]
pub async fn get_queue_stats(
    repo: State<'_, Repository>,
) -> Result<QueueStats> {
    let all_items = repo.get_all_learning_items().await?;
    let now = Utc::now();

    let mut stats = QueueStats {
        total_items: all_items.len() as i32,
        due_today: 0,
        overdue: 0,
        new_items: 0,
        learning_items: 0,
        review_items: 0,
        total_estimated_time: 0,
        suspended: 0,
    };

    for item in &all_items {
        // Count suspended
        if item.is_suspended {
            stats.suspended += 1;
            continue;
        }

        // Count by state
        match item.state {
            crate::models::ItemState::New => stats.new_items += 1,
            crate::models::ItemState::Learning | crate::models::ItemState::Relearning => {
                stats.learning_items += 1
            }
            crate::models::ItemState::Review => stats.review_items += 1,
        }

        // Count due today/overdue
        if item.due_date <= now {
            stats.due_today += 1;
            if item.due_date < now && item.review_count > 0 {
                stats.overdue += 1;
            }
        }

        // Add estimated time
        let est_time = match item.item_type {
            crate::models::ItemType::Cloze => 2,
            crate::models::ItemType::Qa => 3,
            _ => 1,
        };
        stats.total_estimated_time += est_time;
    }

    Ok(stats)
}

/// Postpone an item (reschedule for later)
#[tauri::command]
pub async fn postpone_item(
    item_id: String,
    days: i32,
    repo: State<'_, Repository>,
) -> Result<LearningItem> {
    let mut item = repo.get_all_learning_items().await?
        .into_iter()
        .find(|i| i.id == item_id)
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Item {}", item_id)))?;

    // Reschedule by adding days to due date
    item.due_date = item.due_date + Duration::days(days as i64);
    item.date_modified = Utc::now();

    repo.update_learning_item(&item).await?;
    Ok(item)
}

/// Bulk suspend items
#[tauri::command]
pub async fn bulk_suspend_items(
    item_ids: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<BulkOperationResult> {
    let mut result = BulkOperationResult {
        succeeded: Vec::new(),
        failed: Vec::new(),
        errors: Vec::new(),
    };

    for item_id in &item_ids {
        match repo.get_all_learning_items().await {
            Ok(all_items) => {
                if let Some(mut item) = all_items.into_iter().find(|i| &i.id == item_id) {
                    item.is_suspended = true;
                    item.date_modified = Utc::now();

                    match repo.update_learning_item(&item).await {
                        Ok(_) => result.succeeded.push(item_id.clone()),
                        Err(e) => {
                            result.failed.push(item_id.clone());
                            result.errors.push(format!("{}: {}", item_id, e));
                        }
                    }
                } else {
                    result.failed.push(item_id.clone());
                    result.errors.push(format!("{}: Item not found", item_id));
                }
            }
            Err(e) => {
                result.failed.push(item_id.clone());
                result.errors.push(format!("{}: {}", item_id, e));
            }
        }
    }

    Ok(result)
}

/// Bulk unsuspend items
#[tauri::command]
pub async fn bulk_unsuspend_items(
    item_ids: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<BulkOperationResult> {
    let mut result = BulkOperationResult {
        succeeded: Vec::new(),
        failed: Vec::new(),
        errors: Vec::new(),
    };

    for item_id in &item_ids {
        match repo.get_all_learning_items().await {
            Ok(all_items) => {
                if let Some(mut item) = all_items.into_iter().find(|i| &i.id == item_id) {
                    item.is_suspended = false;
                    item.date_modified = Utc::now();

                    match repo.update_learning_item(&item).await {
                        Ok(_) => result.succeeded.push(item_id.clone()),
                        Err(e) => {
                            result.failed.push(item_id.clone());
                            result.errors.push(format!("{}: {}", item_id, e));
                        }
                    }
                } else {
                    result.failed.push(item_id.clone());
                    result.errors.push(format!("{}: Item not found", item_id));
                }
            }
            Err(e) => {
                result.failed.push(item_id.clone());
                result.errors.push(format!("{}: {}", item_id, e));
            }
        }
    }

    Ok(result)
}

/// Bulk delete items
#[tauri::command]
pub async fn bulk_delete_items(
    item_ids: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<BulkOperationResult> {
    let mut result = BulkOperationResult {
        succeeded: Vec::new(),
        failed: Vec::new(),
        errors: Vec::new(),
    };

    for item_id in &item_ids {
        // Delete from database directly via SQL
        match sqlx::query("DELETE FROM learning_items WHERE id = ?")
            .bind(item_id)
            .execute(repo.pool())
            .await
        {
            Ok(_) => result.succeeded.push(item_id.clone()),
            Err(e) => {
                result.failed.push(item_id.clone());
                result.errors.push(format!("{}: {}", item_id, e));
            }
        }
    }

    Ok(result)
}

/// Export queue data
#[tauri::command]
pub async fn export_queue(
    repo: State<'_, Repository>,
) -> Result<Vec<QueueExportItem>> {
    let all_items = repo.get_all_learning_items().await?;
    let mut export_items = Vec::new();

    for item in all_items {
        // Skip suspended items
        if item.is_suspended {
            continue;
        }

        // Get document title
        let document_title = if let Some(doc_id) = &item.document_id {
            repo.get_document(doc_id).await?
                .map(|d| d.title)
                .unwrap_or_else(|| "Unknown Document".to_string())
        } else {
            "Unknown Document".to_string()
        };

        // Get category from extract if available
        let category = if let Some(extract_id) = &item.extract_id {
            repo.get_extract(extract_id).await?
                .and_then(|e| e.category)
        } else {
            None
        };

        export_items.push(QueueExportItem {
            id: item.id.clone(),
            document_title,
            item_type: format!("{:?}", item.item_type),
            question: item.question,
            answer: item.answer,
            due_date: item.due_date.to_rfc3339(),
            state: format!("{:?}", item.state),
            interval: item.interval,
            tags: item.tags,
            category,
        });
    }

    Ok(export_items)
}
