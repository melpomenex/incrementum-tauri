//! Queue commands

use tauri::State;
use crate::database::Repository;
use crate::algorithms::{calculate_fsrs_document_priority, QueueSelector};
use crate::error::Result;
use crate::models::QueueItem;
use chrono::Utc;

/// Get the next queue item
///
/// This uses the QueueSelector with weighted randomization to select the next item
/// from the queue, similar to the Incrementum-CPP implementation.
#[tauri::command]
pub async fn get_next_queue_item(
    randomness: Option<f32>,
    repo: State<'_, Repository>,
) -> Result<Option<QueueItem>> {
    let queue = get_queue(repo).await?;
    if queue.is_empty() {
        return Ok(None);
    }

    let selector = QueueSelector::new(randomness.unwrap_or(0.3));
    Ok(selector.get_next_item(&queue).cloned())
}

/// Get multiple queue items
#[tauri::command]
pub async fn get_queue_items(
    count: Option<usize>,
    randomness: Option<f32>,
    repo: State<'_, Repository>,
) -> Result<Vec<QueueItem>> {
    let queue = get_queue(repo).await?;
    let count = count.unwrap_or(10).min(queue.len());

    let selector = QueueSelector::new(randomness.unwrap_or(0.3));
    Ok(selector.get_next_items(&queue, count).into_iter().cloned().collect())
}

/// Get all queue items
///
/// This returns all items that should be in the queue, including:
/// - Learning items that are due
/// - Documents scheduled for reading (based on next_reading_date)
/// - Documents without scheduled dates (for initial reading)
#[tauri::command]
pub async fn get_queue(
    repo: State<'_, Repository>,
) -> Result<Vec<QueueItem>> {
    let mut queue_items = Vec::new();

    // Get learning items
    let learning_items = repo.get_all_learning_items().await?;
    let now = Utc::now();

    for item in learning_items {
        // Skip suspended items
        if item.is_suspended {
            continue;
        }

        // Calculate priority based on due date and other factors
        let is_due = item.due_date <= now;
        let days_until_due = (item.due_date - now).num_days();

        // Priority calculation:
        // - Items that are due get higher priority (8-10)
        // - Items due soon get medium priority (5-7)
        // - Items due later get lower priority (1-4)
        let priority = if is_due {
            10.0 - (item.interval / 10.0) // New items (interval 0) get priority 10
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
        } else if item.interval >= 21.0 {
            100
        } else {
            ((item.interval) / 21.0 * 100.0) as i32
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

    // Get extracts for incremental reading processing
    // Include both new extracts (never reviewed) and due extracts (scheduled for review)
    let due_extracts = repo.get_due_extracts(&now).await?;
    let new_extracts = repo.get_new_extracts().await?;
    
    // Combine into a single list, marking new ones
    for extract in due_extracts.into_iter().chain(new_extracts.into_iter()) {
        // Get parent document title
        let document_title = repo.get_document(&extract.document_id).await?
            .map(|d| d.title)
            .unwrap_or_else(|| "Unknown Document".to_string());
        
        // New extracts (review_count == 0) get highest priority (9.0)
        // Previously reviewed extracts get medium-high priority (7.0)
        let priority = if extract.review_count == 0 {
            9.0 // New extracts are urgent - need to be processed into flashcards
        } else {
            7.0 // Reviewed extracts returning for another pass
        };
        
        // Extract content preview (first 100 chars)
        let _content_preview = if extract.content.len() > 100 {
            format!("{}...", &extract.content[..100])
        } else {
            extract.content.clone()
        };
        
        queue_items.push(QueueItem {
            id: extract.id.clone(),
            document_id: extract.document_id.clone(),
            document_title: format!("{} - Extract", document_title),
            extract_id: Some(extract.id.clone()),
            learning_item_id: None,
            item_type: "extract".to_string(),
            priority_rating: None,
            priority_slider: None,
            priority,
            due_date: extract.next_review_date.map(|d| d.to_rfc3339()),
            estimated_time: 3, // Extracts take ~3 minutes to process
            tags: extract.tags.clone(),
            category: extract.category.clone(),
            progress: 0, // Extracts don't track progress
        });
    }

    // Get documents for incremental reading
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

        // Calculate FSRS-based priority for documents
        // This uses next_reading_date as the primary factor, with stability and
        // difficulty as secondary factors. The user's priority_rating acts as a multiplier.
        let priority = calculate_fsrs_document_priority(
            document.next_reading_date,
            document.stability,
            document.difficulty,
            document.priority_rating,
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
            priority,
            due_date: document.next_reading_date.map(|d| d.to_rfc3339()),
            estimated_time: 5,
            tags: document.tags.clone(),
            category: document.category.clone(),
            progress,
        });
    }

    // Sort by priority (descending) then by due date (ascending)
    queue_items.sort_by(|a, b| {
        match b.priority.partial_cmp(&a.priority) {
            Some(std::cmp::Ordering::Equal) => {}
            Some(ord) => return ord,
            None => {}
        }

        match (&a.due_date, &b.due_date) {
            (Some(a_date), Some(b_date)) => {
                a_date.partial_cmp(b_date).unwrap_or(std::cmp::Ordering::Equal)
            }
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        }
    });

    Ok(queue_items)
}

/// Get queued items (items that are due or should be in the reading queue)
#[tauri::command]
pub async fn get_queued_items(
    randomness: Option<f32>,
    repo: State<'_, Repository>,
) -> Result<Vec<QueueItem>> {
    let queue = get_queue(repo).await?;
    let selector = QueueSelector::new(randomness.unwrap_or(0.3));

    // Filter and sort using the queue selector
    let mut queued_items: Vec<QueueItem> = selector.get_queued_items(&queue)
        .into_iter()
        .cloned()
        .collect();

    selector.sort_queue_items(&mut queued_items);
    Ok(queued_items)
}

/// Get due queue items only
#[tauri::command]
pub async fn get_due_queue_items(
    randomness: Option<f32>,
    repo: State<'_, Repository>,
) -> Result<Vec<QueueItem>> {
    let queue = get_queue(repo).await?;
    let selector = QueueSelector::new(randomness.unwrap_or(0.3));

    let mut due_items: Vec<QueueItem> = selector.filter_due_items(&queue)
        .into_iter()
        .cloned()
        .collect();

    selector.sort_queue_items(&mut due_items);
    Ok(due_items)
}

/// Get only due documents (excluding learning items and extracts)
///
/// This provides a "Due Today" view focused specifically on documents that
/// are scheduled for reading via FSRS (next_reading_date <= now) or have
/// never been read (next_reading_date is NULL).
#[tauri::command]
pub async fn get_due_documents_only(
    repo: State<'_, Repository>,
) -> Result<Vec<QueueItem>> {
    let mut due_documents = Vec::new();
    let now = Utc::now();

    // Get all documents
    let documents = repo.list_documents().await?;

    for document in documents {
        // Skip archived documents
        if document.is_archived {
            continue;
        }

        // Include documents that are due (next_reading_date <= now)
        // OR documents that have never been read (next_reading_date is NULL)
        let is_due = document.next_reading_date.map_or(true, |next_date| next_date <= now);

        if !is_due {
            continue; // Skip future-dated documents
        }

        let progress = match (document.current_page, document.total_pages) {
            (Some(current), Some(total)) if total > 0 => {
                ((current as f64 / total as f64) * 100.0).round() as i32
            }
            _ => 0,
        };

        // Calculate FSRS-based priority
        let priority = calculate_fsrs_document_priority(
            document.next_reading_date,
            document.stability,
            document.difficulty,
            document.priority_rating,
        );

        due_documents.push(QueueItem {
            id: document.id.clone(),
            document_id: document.id.clone(),
            document_title: document.title.clone(),
            extract_id: None,
            learning_item_id: None,
            item_type: "document".to_string(),
            priority_rating: Some(document.priority_rating),
            priority_slider: Some(document.priority_slider),
            priority,
            due_date: document.next_reading_date.map(|d| d.to_rfc3339()),
            estimated_time: 5,
            tags: document.tags.clone(),
            category: document.category.clone(),
            progress,
        });
    }

    // Sort using FSRS-based priority
    let selector = QueueSelector::new(0.0); // No randomness for due documents
    selector.sort_queue_items(&mut due_documents);

    Ok(due_documents)
}
