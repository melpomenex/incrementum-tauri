//! Extract review commands

use tauri::State;
use crate::database::Repository;
use crate::error::Result;
use crate::models::{Extract, LearningItem, ItemType, MemoryState};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractReviewResult {
    pub extract: Extract,
    pub next_review_date: String,
}

/// Submit a review for an extract
/// This schedules the next review using a simplified FSRS-like approach for extracts
#[tauri::command]
pub async fn submit_extract_review(
    extract_id: String,
    rating: i32, // 1=Again, 2=Hard, 3=Good, 4=Easy
    _time_taken: i32,
    repo: State<'_, Repository>,
) -> Result<Extract> {
    let mut extract = repo.get_extract(&extract_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Extract {}", extract_id)))?;

    let now = Utc::now();
    
    // Initialize memory state if missing
    if extract.memory_state.is_none() {
        extract.memory_state = Some(MemoryState {
            stability: 0.5, // Initial stability (in days)
            difficulty: 5.0, // Initial difficulty
        });
    }
    
    let mut memory = extract.memory_state.unwrap();
    
    // Simplified FSRS logic for extracts (prioritize reading over precise memory retention)
    // Extracts are usually "read and processed", not memorized verbatim
    let new_interval_days = match rating {
        1 => 1.0, // Again: Review tomorrow
        2 => { // Hard: maintain or slight increase
            memory.difficulty = (memory.difficulty + 1.0).min(10.0);
            (memory.stability * 1.2).max(1.0)
        },
        3 => { // Good: standard increase
            memory.stability = (memory.stability * 2.5).max(1.0);
            memory.stability
        },
        4 => { // Easy: large increase (processed well)
            memory.stability = (memory.stability * 4.0).max(1.0);
            memory.difficulty = (memory.difficulty - 1.0).max(1.0);
            memory.stability
        },
        _ => memory.stability,
    };
    
    // Update memory state
    memory.stability = new_interval_days;
    let memory_stability = memory.stability;
    let memory_difficulty = memory.difficulty;
    extract.memory_state = Some(memory);
    
    // Calculate new date
    let next_date = now + Duration::days(new_interval_days as i64);
    
    // Update extract
    repo.update_extract_scheduling(
        &extract.id,
        Some(next_date),
        Some(memory_stability),
        Some(memory_difficulty),
        Some(extract.review_count + 1),
        Some(extract.reps + 1),
        Some(now),
    ).await?;
    
    // Refresh object to return
    extract.next_review_date = Some(next_date);
    extract.review_count += 1;
    extract.reps += 1;
    extract.last_review_date = Some(now);
    
    Ok(extract)
}

/// Create a cloze deletion from an extract with selected text
#[tauri::command]
pub async fn create_cloze_from_extract(
    extract_id: String,
    cloze_text: String,
    cloze_ranges: Vec<(usize, usize)>,
    repo: State<'_, Repository>,
) -> Result<LearningItem> {
    let extract = repo.get_extract(&extract_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Extract {}", extract_id)))?;
        
    let mut item = LearningItem::from_extract(
        extract.id.clone(),
        extract.document_id.clone(),
        ItemType::Cloze,
        "Cloze Deletion".to_string(), // Placeholder question, real content is in cloze_text
        None,
    );
    
    item.cloze_text = Some(cloze_text);
    item.cloze_ranges = Some(cloze_ranges);
    item.tags = extract.tags.clone();
    
    // Add "cloze" tag if not present
    if !item.tags.iter().any(|t| t == "cloze") {
        item.tags.push("cloze".to_string());
    }
    
    repo.create_learning_item(&item).await
}

/// Get all extracts that are due for review or are new
#[tauri::command]
pub async fn get_reviewable_extracts(
    repo: State<'_, Repository>,
) -> Result<Vec<Extract>> {
    let now = Utc::now();
    let due_extracts = repo.get_due_extracts(&now).await?;
    let new_extracts = repo.get_new_extracts().await?;
    
    // Combine and return
    let mut all_extracts = due_extracts;
    all_extracts.extend(new_extracts);
    
    Ok(all_extracts)
}

/// Create a Q&A card from an extract
#[tauri::command]
pub async fn create_qa_from_extract(
    extract_id: String,
    question: String,
    answer: String,
    repo: State<'_, Repository>,
) -> Result<LearningItem> {
    let extract = repo.get_extract(&extract_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Extract {}", extract_id)))?;
        
    let mut item = LearningItem::from_extract(
        extract.id.clone(),
        extract.document_id.clone(),
        ItemType::Qa,
        question,
        Some(answer),
    );
    
    item.tags = extract.tags.clone();
    
    repo.create_learning_item(&item).await
}
