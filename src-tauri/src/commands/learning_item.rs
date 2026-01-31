//! Learning item commands

use tauri::State;
use crate::database::Repository;
use crate::commands::review::RepositoryExt;
use crate::error::Result;
use crate::generator::LearningItemGenerator;
use crate::models::{LearningItem, ItemType};

#[tauri::command]
pub async fn get_due_items(
    repo: State<'_, Repository>,
) -> Result<Vec<LearningItem>> {
    let now = chrono::Utc::now();
    let items = repo.get_due_learning_items(&now).await?;
    Ok(items)
}

#[tauri::command]
pub async fn create_learning_item(
    item_type: String,
    question: String,
    repo: State<'_, Repository>,
) -> Result<LearningItem> {
    let item_type = match item_type.as_str() {
        "flashcard" => ItemType::Flashcard,
        "cloze" => ItemType::Cloze,
        "qa" => ItemType::Qa,
        _ => ItemType::Basic,
    };

    let item = LearningItem::new(item_type, question);
    let created = repo.create_learning_item(&item).await?;
    Ok(created)
}

#[tauri::command]
pub async fn generate_learning_items_from_extract(
    extract_id: String,
    repo: State<'_, Repository>,
) -> Result<Vec<LearningItem>> {
    // Get the extract
    let extract = repo.get_extract(&extract_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Extract {}", extract_id)))?;

    // Generate learning items
    let generator = LearningItemGenerator::new();
    let items = generator.generate_from_extract(&extract);

    // Save each item
    let mut created_items = Vec::new();
    for item in items {
        let created = repo.create_learning_item(&item).await?;
        created_items.push(created);
    }

    Ok(created_items)
}

#[tauri::command]
pub async fn get_learning_items(
    document_id: String,
    repo: State<'_, Repository>,
) -> Result<Vec<LearningItem>> {
    let items = repo.get_learning_items_by_document(&document_id).await?;
    Ok(items)
}

#[tauri::command]
pub async fn get_learning_item(
    item_id: String,
    repo: State<'_, Repository>,
) -> Result<Option<LearningItem>> {
    let item = repo.get_learning_item(&item_id).await?;
    Ok(item)
}

#[tauri::command]
pub async fn get_learning_items_by_extract(
    extract_id: String,
    repo: State<'_, Repository>,
) -> Result<Vec<LearningItem>> {
    let items = repo.get_learning_items_by_extract(&extract_id).await?;
    Ok(items)
}

#[tauri::command]
pub async fn get_all_learning_items(
    repo: State<'_, Repository>,
) -> Result<Vec<LearningItem>> {
    let items = repo.get_all_learning_items().await?;
    Ok(items)
}
