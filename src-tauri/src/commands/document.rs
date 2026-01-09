//! Document commands

use tauri::State;
use crate::database::Repository;
use crate::algorithms::calculate_document_priority_score;
use crate::error::Result;
use crate::models::{Document, FileType, DocumentMetadata};
use crate::processor;
use std::path::PathBuf;

#[tauri::command]
pub async fn open_file_picker(
    _title: Option<String>,
    _multiple: Option<bool>,
) -> Result<Vec<String>> {
    // This will be handled by the frontend using Tauri's dialog API
    // The command is a placeholder for future backend processing if needed
    Ok(vec![])
}

#[tauri::command]
pub async fn import_document(
    file_path: String,
    repo: State<'_, Repository>,
) -> Result<Document> {
    let path = PathBuf::from(&file_path);

    // Determine file type from extension
    let file_type = match path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
        .as_deref() {
        Some("pdf") => FileType::Pdf,
        Some("epub") => FileType::Epub,
        Some("md") | Some("markdown") => FileType::Markdown,
        Some("html") | Some("htm") => FileType::Html,
        Some("mp3") | Some("wav") | Some("m4a") | Some("ogg") => FileType::Audio,
        Some("mp4") | Some("webm") | Some("mov") | Some("avi") => FileType::Video,
        _ => FileType::Other,
    };

    // Extract content from the file
    let extracted = processor::extract_content(&file_path, file_type.clone()).await?;

    // Generate content hash for duplicate detection
    let content_hash = if !extracted.text.is_empty() {
        Some(processor::generate_content_hash(&extracted.text))
    } else {
        None
    };

    // Check for duplicate by content hash
    if let Some(ref hash) = content_hash {
        let existing_docs = repo.list_documents().await?;
        if let Some(duplicate) = existing_docs.iter().find(|d| d.content_hash.as_ref() == Some(hash)) {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Duplicate document detected: Already imported as '{}'",
                duplicate.title
            ))
            .into());
        }
    }

    // Use extracted title or fall back to filename
    let title = extracted.title.clone().unwrap_or_else(|| {
        path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string()
    });

    // Create metadata from extracted info
    let metadata = Some(DocumentMetadata {
        author: extracted.author,
        subject: None,
        keywords: None,
        created_at: None,
        modified_at: None,
        file_size: None,
        language: None,
        page_count: extracted.page_count.map(|p| p as i32),
        word_count: None,
    });

    // Create the document
    let mut doc = Document::new(title, file_path, file_type);
    doc.content = Some(extracted.text);
    doc.content_hash = content_hash;
    doc.total_pages = extracted.page_count.map(|p| p as i32);
    doc.metadata = metadata;

    let created = repo.create_document(&doc).await?;

    Ok(created)
}

#[tauri::command]
pub async fn import_documents(
    file_paths: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<Vec<Document>> {
    let mut imported = Vec::new();

    for file_path in file_paths {
        let path_clone = file_path.clone();
        match import_document(file_path, repo.clone()).await {
            Ok(doc) => imported.push(doc),
            Err(e) => {
                eprintln!("Failed to import {}: {}", path_clone, e);
                // Continue with other files
            }
        }
    }

    Ok(imported)
}

#[tauri::command]
pub async fn get_documents(
    repo: State<'_, Repository>,
) -> Result<Vec<Document>> {
    let docs = repo.list_documents().await?;
    Ok(docs)
}

#[tauri::command]
pub async fn get_document(
    id: String,
    repo: State<'_, Repository>,
) -> Result<Option<Document>> {
    let doc = repo.get_document(&id).await?;
    Ok(doc)
}

#[tauri::command]
pub async fn create_document(
    title: String,
    file_path: String,
    file_type: String,
    repo: State<'_, Repository>,
) -> Result<Document> {
    let file_type = match file_type.as_str() {
        "pdf" => FileType::Pdf,
        "epub" => FileType::Epub,
        "markdown" => FileType::Markdown,
        "html" => FileType::Html,
        "youtube" => FileType::Youtube,
        "audio" => FileType::Audio,
        "video" => FileType::Video,
        _ => FileType::Other,
    };

    let doc = Document::new(title, file_path, file_type);
    let created = repo.create_document(&doc).await?;
    Ok(created)
}

#[tauri::command]
pub async fn update_document(
    id: String,
    updates: Document,
    repo: State<'_, Repository>,
) -> Result<Document> {
    let updated = repo.update_document(&id, &updates).await?;
    Ok(updated)
}

#[tauri::command]
pub async fn update_document_priority(
    id: String,
    rating: i32,
    slider: i32,
    repo: State<'_, Repository>,
) -> Result<Document> {
    let rating_value = if (1..=4).contains(&rating) { rating } else { 0 };
    let slider_value = slider.clamp(0, 100);
    let score = calculate_document_priority_score(
        if rating_value > 0 { Some(rating_value) } else { None },
        slider_value,
    );

    let updated = repo
        .update_document_priority(&id, rating_value, slider_value, score)
        .await?;
    Ok(updated)
}

#[tauri::command]
pub async fn delete_document(
    id: String,
    repo: State<'_, Repository>,
) -> Result<()> {
    repo.delete_document(&id).await?;
    Ok(())
}

#[tauri::command]
pub async fn read_document_file(
    file_path: String,
) -> Result<String> {
    use std::fs;
    use base64::{Engine as _, engine::general_purpose};

    let bytes = fs::read(&file_path)
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to read file: {}", e)))?;

    let base64_string = general_purpose::STANDARD.encode(&bytes);
    Ok(base64_string)
}
