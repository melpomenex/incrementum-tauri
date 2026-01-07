//! Extract commands

use tauri::State;
use crate::database::Repository;
use crate::error::Result;
use crate::models::Extract;

#[tauri::command]
pub async fn get_extracts(
    document_id: String,
    repo: State<'_, Repository>,
) -> Result<Vec<Extract>> {
    let extracts = repo.list_extracts_by_document(&document_id).await?;
    Ok(extracts)
}

#[tauri::command]
pub async fn get_extract(
    id: String,
    repo: State<'_, Repository>,
) -> Result<Option<Extract>> {
    let extract = repo.get_extract(&id).await?;
    Ok(extract)
}

#[tauri::command]
pub async fn create_extract(
    document_id: String,
    content: String,
    note: Option<String>,
    tags: Option<Vec<String>>,
    category: Option<String>,
    color: Option<String>,
    page_number: Option<i32>,
    max_disclosure_level: Option<i32>,
    repo: State<'_, Repository>,
) -> Result<Extract> {
    let mut extract = Extract::new(document_id, content);
    extract.notes = note;
    extract.tags = tags.unwrap_or_default();
    extract.category = category;
    extract.highlight_color = color;
    extract.page_number = page_number;
    if let Some(level) = max_disclosure_level {
        extract.max_disclosure_level = level;
    }
    let created = repo.create_extract(&extract).await?;
    Ok(created)
}

#[tauri::command]
pub async fn update_extract(
    id: String,
    content: Option<String>,
    note: Option<String>,
    tags: Option<Vec<String>>,
    category: Option<String>,
    color: Option<String>,
    max_disclosure_level: Option<i32>,
    repo: State<'_, Repository>,
) -> Result<Extract> {
    // Get existing extract
    let mut extract = repo.get_extract(&id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Extract {}", id)))?;

    // Update fields
    if let Some(content) = content {
        extract.content = content;
    }
    if let Some(note) = note {
        extract.notes = Some(note);
    }
    if let Some(tags) = tags {
        extract.tags = tags;
    }
    if let Some(category) = category {
        extract.category = Some(category);
    }
    if let Some(color) = color {
        extract.highlight_color = Some(color);
    }
    if let Some(level) = max_disclosure_level {
        extract.max_disclosure_level = level;
    }
    extract.date_modified = chrono::Utc::now();

    // Save the updated extract
    repo.update_extract(&extract).await?;
    Ok(extract)
}

#[tauri::command]
pub async fn delete_extract(
    id: String,
    repo: State<'_, Repository>,
) -> Result<()> {
    repo.delete_extract(&id).await?;
    Ok(())
}
