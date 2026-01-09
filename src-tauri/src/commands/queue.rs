//! Queue commands

use tauri::State;
use crate::database::Repository;
use crate::algorithms::calculate_document_priority_score;
use crate::error::Result;
use crate::models::QueueItem;
use chrono::Utc;

#[tauri::command]
pub async fn get_queue(
    repo: State<'_, Repository>,
) -> Result<Vec<QueueItem>> {
    // Get all learning items (these represent the queue)
    // For now, we'll include all active learning items sorted by priority (due date)
    let learning_items = repo.get_all_learning_items().await?;

    let mut queue_items = Vec::new();

    for item in learning_items {
        // Skip suspended items
        if item.is_suspended {
            continue;
        }

        // Calculate priority based on due date and other factors
        let now = Utc::now();
        let is_due = item.due_date <= now;
        let days_until_due = (item.due_date - now).num_days();

        // Priority calculation:
        // - Items that are due get higher priority (8-10)
        // - Items due soon get medium priority (5-7)
        // - Items due later get lower priority (1-4)
        let priority = if is_due {
            10.0 - (item.interval as f64 / 10.0) // New items (interval 0) get priority 10
        } else if days_until_due <= 1 {
            8.0
        } else if days_until_due <= 3 {
            6.0
        } else if days_until_due <= 7 {
            4.0
        } else {
            2.0
        };

        // Calculate estimated time based on item type
        let estimated_time = match item.item_type {
            crate::models::ItemType::Cloze => 2,
            crate::models::ItemType::Qa => 3,
            _ => 1,
        };

        // Calculate progress (inverse of interval/reviews to show "learning progress")
        let progress = if item.review_count == 0 {
            0
        } else if item.interval >= 21 {
            100
        } else {
            ((item.interval as f64) / 21.0 * 100.0) as i32
        };

        // Get document title
        let document_title = if let Some(doc_id) = &item.document_id {
            repo.get_document(doc_id).await?
                .map(|d| d.title)
                .unwrap_or_else(|| "Unknown Document".to_string())
        } else {
            "Unknown Document".to_string()
        };

        queue_items.push(QueueItem {
            id: item.id.clone(),
            document_id: item.document_id.unwrap_or_default(),
            document_title,
            extract_id: item.extract_id.clone(),
            learning_item_id: Some(item.id.clone()),
            item_type: "learning-item".to_string(),
            priority_rating: None,
            priority_slider: None,
            priority,
            due_date: Some(item.due_date.to_rfc3339()),
            estimated_time,
            tags: item.tags.clone(),
            category: None, // Could be derived from the extract's category
            progress,
        });
    }

    let documents = repo.list_documents().await?;
    for document in documents {
        if document.is_archived {
            continue;
        }

        let progress = match (document.current_page, document.total_pages) {
            (Some(current), Some(total)) if total > 0 => {
                ((current as f64 / total as f64) * 100.0).round() as i32
            }
            _ => 0,
        };

        let priority_score = calculate_document_priority_score(
            if document.priority_rating > 0 {
                Some(document.priority_rating)
            } else {
                None
            },
            document.priority_slider,
        );

        queue_items.push(QueueItem {
            id: document.id.clone(),
            document_id: document.id.clone(),
            document_title: document.title.clone(),
            extract_id: None,
            learning_item_id: None,
            item_type: "document".to_string(),
            priority_rating: Some(document.priority_rating),
            priority_slider: Some(document.priority_slider),
            priority: priority_score,
            due_date: None,
            estimated_time: 5,
            tags: document.tags.clone(),
            category: document.category.clone(),
            progress,
        });
    }

    // Sort by priority (descending)
    queue_items.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap_or(std::cmp::Ordering::Equal));

    Ok(queue_items)
}
