//! Document commands

use tauri::State;
use crate::database::Repository;
use crate::algorithms::calculate_document_priority_score;
use crate::error::Result;
use crate::models::{Document, FileType, DocumentMetadata};
use crate::commands::anna_archive::AnnaArchiveClient;
use crate::processor;
use crate::youtube;
use std::path::PathBuf;

fn build_youtube_thumbnail_url(video_id: &str) -> String {
    format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", video_id)
}

async fn resolve_cover_for_document(
    doc: &Document,
    allow_anna: bool,
) -> Result<(Option<String>, Option<String>)> {
    if let Some(url) = &doc.cover_image_url {
        return Ok((Some(url.clone()), doc.cover_image_source.clone()));
    }

    match doc.file_type {
        FileType::Pdf => {
            if let Ok(Some(url)) = processor::pdf::extract_pdf_cover_data_url(&doc.file_path).await {
                return Ok((Some(url), Some("embedded".to_string())));
            }
        }
        FileType::Epub => {
            if let Ok(Some(url)) = processor::epub::extract_epub_cover_data_url(&doc.file_path).await {
                return Ok((Some(url), Some("embedded".to_string())));
            }
        }
        FileType::Youtube => {
            if let Some(video_id) = youtube::extract_video_id(&doc.file_path) {
                return Ok((Some(build_youtube_thumbnail_url(&video_id)), Some("youtube".to_string())));
            }
        }
        _ => {}
    }

    if allow_anna && matches!(doc.file_type, FileType::Pdf | FileType::Epub | FileType::Markdown | FileType::Html | FileType::Other) {
        let author = doc.metadata.as_ref().and_then(|meta| meta.author.clone());
        let query = if let Some(author) = author {
            format!("{} {}", doc.title, author)
        } else {
            doc.title.clone()
        };

        if !query.trim().is_empty() {
            let client = AnnaArchiveClient::new();
            if let Ok(results) = client.search_books(&query, 5).await {
                if let Some(result) = results.into_iter().find(|item| item.cover_url.as_ref().map(|u| !u.is_empty()).unwrap_or(false)) {
                    return Ok((result.cover_url, Some("anna".to_string())));
                }
            }
        }
    }

    if allow_anna {
        return Ok((None, Some("fallback".to_string())));
    }

    Ok((None, None))
}

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
            )));
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
    let (cover_url, cover_source) = resolve_cover_for_document(&doc, false).await?;
    doc.cover_image_url = cover_url;
    doc.cover_image_source = cover_source;

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
    let mut doc = match repo.get_document(&id).await? {
        Some(doc) => doc,
        None => return Ok(None),
    };

    let has_epub_placeholder = doc
        .content
        .as_ref()
        .map(|content| {
            let normalized = content.trim();
            normalized.starts_with("EPUB file loaded (")
                && normalized.contains("Full content extraction requires additional EPUB library integration.")
        })
        .unwrap_or(false);

    let needs_content = doc
        .content
        .as_ref()
        .map(|content| content.trim().is_empty())
        .unwrap_or(true)
        || has_epub_placeholder;

    if needs_content && matches!(doc.file_type, FileType::Epub) {
        if let Ok(extracted) = processor::extract_content(&doc.file_path, doc.file_type.clone()).await {
            if !extracted.text.trim().is_empty() {
                let content_hash = Some(processor::generate_content_hash(&extracted.text));
                let metadata = Some(DocumentMetadata {
                    author: extracted.author.clone(),
                    subject: None,
                    keywords: None,
                    created_at: None,
                    modified_at: None,
                    file_size: None,
                    language: extracted
                        .metadata
                        .get("language")
                        .and_then(|value| value.as_str())
                        .map(|value| value.to_string()),
                    page_count: extracted.page_count.map(|p| p as i32),
                    word_count: None,
                });

                repo.update_document_content(
                    &doc.id,
                    &extracted.text,
                    content_hash.clone(),
                    extracted.page_count.map(|p| p as i32),
                    metadata.clone(),
                )
                .await?;

                doc.content = Some(extracted.text);
                doc.content_hash = content_hash;
                doc.total_pages = extracted.page_count.map(|p| p as i32);
                doc.metadata = metadata;
            }
        }
    }

    Ok(Some(doc))
}

#[tauri::command]
pub async fn resolve_document_cover(
    id: String,
    repo: State<'_, Repository>,
) -> Result<Option<Document>> {
    let mut doc = match repo.get_document(&id).await? {
        Some(doc) => doc,
        None => return Ok(None),
    };

    if doc.cover_image_url.is_some() {
        return Ok(Some(doc));
    }

    let (cover_url, cover_source) = resolve_cover_for_document(&doc, true).await?;
    if cover_url.is_some() || cover_source.is_some() {
        repo.update_document_cover(&doc.id, cover_url.clone(), cover_source.clone()).await?;
        doc.cover_image_url = cover_url;
        doc.cover_image_source = cover_source;
    }

    Ok(Some(doc))
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
pub async fn update_document_content(
    id: String,
    content: String,
    repo: State<'_, Repository>,
) -> Result<Document> {
    repo.update_document_content(&id, &content, None, None, None).await?;
    repo.get_document(&id)
        .await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound(format!("Document {}", id)))
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

/// Update the current page/progress of a document
/// For YouTube videos, this stores the current playback position in seconds
#[tauri::command]
pub async fn update_document_progress(
    id: String,
    current_page: Option<i32>,
    current_scroll_percent: Option<f64>,
    current_cfi: Option<String>,
    repo: State<'_, Repository>,
) -> Result<Document> {
    let updated = repo
        .update_document_progress(&id, current_page, current_scroll_percent, current_cfi)
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

/// Result from fetching URL content
#[derive(serde::Serialize)]
pub struct FetchedUrlContent {
    pub file_path: String,
    pub file_name: String,
    pub content_type: String,
}

/// Fetch content from a URL and save it to a temporary location
/// Used for Arxiv PDF downloads and URL-based imports
#[tauri::command]
pub async fn fetch_url_content(url: String) -> Result<FetchedUrlContent> {
    use reqwest;
    use std::time::Duration;

    // Parse URL to determine file name
    let url_parsed = url.parse::<reqwest::Url>()
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Invalid URL: {}", e)))?;

    // Extract filename from URL or generate one
    let file_name = url_parsed
        .path_segments()
        .and_then(|mut segments| segments.next_back())
        .unwrap_or("download")
        .to_string();

    // Determine content type from URL extension
    let content_type = if file_name.ends_with(".pdf") {
        "pdf"
    } else if file_name.ends_with(".epub") {
        "epub"
    } else if file_name.ends_with(".md") || file_name.ends_with(".markdown") {
        "markdown"
    } else if file_name.ends_with(".html") || file_name.ends_with(".htm") {
        "html"
    } else {
        // Try to determine from content type header
        "unknown"
    };

    // Create a temporary directory for downloads
    let temp_dir = std::env::temp_dir();
    let download_dir = temp_dir.join("incrementum-downloads");

    std::fs::create_dir_all(&download_dir)
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to create download directory: {}", e)))?;

    // Generate a unique filename
    let timestamp = chrono::Utc::now().timestamp();
    let unique_filename = format!("{}-{}", timestamp, file_name);
    let file_path = download_dir.join(&unique_filename);

    // Download the file
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .user_agent("Incrementum/1.0 (https://incrementum.app)")
        .build()
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to create HTTP client: {}", e)))?;

    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to fetch URL: {}", e)))?;

    if !response.status().is_success() {
        return Err(crate::error::IncrementumError::Internal(format!(
            "HTTP error: {}",
            response.status()
        )));
    }

    // Get content type from response if unknown
    let final_content_type = if content_type == "unknown" {
        response
            .headers()
            .get("content-type")
            .and_then(|ct| ct.to_str().ok())
            .unwrap_or("")
            .to_string()
    } else {
        content_type.to_string()
    };

    // Save the downloaded content
    let bytes = response
        .bytes()
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to download content: {}", e)))?;

    std::fs::write(&file_path, &bytes)
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to save downloaded file: {}", e)))?;

    Ok(FetchedUrlContent {
        file_path: file_path.to_string_lossy().to_string(),
        file_name,
        content_type: final_content_type,
    })
}
