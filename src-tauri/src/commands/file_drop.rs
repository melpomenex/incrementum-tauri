//! File drop handling commands
//!
//! Allows importing files that are dragged and dropped onto the application

use crate::error::{Result, IncrementumError};
use crate::models::{Document, FileType};
use crate::database::Repository;
use tauri::State;

/// Handle dropped files and import them
///
/// This command receives file paths from dropped files and imports them
#[tauri::command]
pub async fn handle_dropped_files(
    file_paths: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<Vec<Document>> {
    let mut imported_docs = Vec::new();

    for file_path in file_paths {
        match import_single_file(&file_path, &repo).await {
            Ok(doc) => {
                imported_docs.push(doc);
            }
            Err(e) => {
                eprintln!("Failed to import {}: {}", file_path, e);
                // Continue with other files instead of failing completely
            }
        }
    }

    if imported_docs.is_empty() {
        return Err(IncrementumError::NotFound(
            "No files could be imported".to_string()
        ));
    }

    Ok(imported_docs)
}

/// Import a single file
async fn import_single_file(
    file_path: &str,
    repo: &Repository,
) -> Result<Document> {
    // Check if file exists
    if !std::path::Path::new(file_path).exists() {
        return Err(IncrementumError::NotFound(format!(
            "File not found: {}",
            file_path
        )));
    }

    // Get file extension
    let extension = std::path::Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    // Map extension to file type
    let file_type = match extension.to_lowercase().as_str() {
        "pdf" => FileType::Pdf,
        "epub" => FileType::Epub,
        "md" | "markdown" => FileType::Markdown,
        "html" | "htm" => FileType::Html,
        "txt" => FileType::Other,
        _ => FileType::Other,
    };

    // Get file name as title
    let file_name = std::path::Path::new(file_path)
        .file_stem()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled Document");

    // Create document
    let doc = Document {
        id: uuid::Uuid::new_v4().to_string(),
        title: file_name.to_string(),
        file_path: file_path.to_string(),
        file_type,
        content: None,
        content_hash: None,
        total_pages: None,
        current_page: None,
        category: None,
        tags: vec![],
        date_added: chrono::Utc::now(),
        date_modified: chrono::Utc::now(),
        date_last_reviewed: None,
        extract_count: 0,
        learning_item_count: 0,
        priority_rating: 0,
        priority_slider: 0,
        priority_score: 5.0,
        is_archived: false,
        is_favorite: false,
        metadata: None,
    };

    // Save to database
    repo.create_document(&doc).await?;

    Ok(doc)
}

/// Validate if a file can be imported
#[tauri::command]
pub fn validate_dropped_file(file_path: String) -> Result<bool> {
    let path = std::path::Path::new(&file_path);

    // Check if file exists
    if !path.exists() {
        return Ok(false);
    }

    // Check if it's a file (not a directory)
    if !path.is_file() {
        return Ok(false);
    }

    // Check if it has a supported extension
    let supported_extensions = ["pdf", "epub", "md", "markdown", "html", "htm", "txt"];
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    let is_supported = supported_extensions.contains(&extension.as_str());

    Ok(is_supported)
}
