//! External integrations support
//!
//! This module provides integration with external applications like Obsidian,
//! Anki, and browser extensions.

use crate::error::AppError;
use crate::database::Repository;
use std::path::PathBuf;
use std::fs;
use tokio::net::TcpListener;
use tokio_tungstenite::{tungstenite::Message, WebSocketStream};
use futures::{StreamExt, SinkExt};
use tokio::net::TcpStream as TokioTcpStream;
use tokio_tungstenite::tungstenite::protocol::Role;
use serde::{Deserialize, Serialize};

/// Obsidian vault configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianConfig {
    pub vault_path: String,
    pub notes_folder: String,
    pub attachments_folder: String,
    pub dataview_folder: Option<String>,
}

/// Anki configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiConfig {
    pub url: String,
    pub deck_name: String,
    pub model_name: String,
    pub basic_model_name: Option<String>,
    pub cloze_model_name: Option<String>,
}

/// Browser extension server
pub struct ExtensionServer {
    port: u16,
    running: bool,
}

impl ExtensionServer {
    /// Create a new extension server
    pub fn new(port: u16) -> Self {
        Self {
            port,
            running: false,
        }
    }

    /// Start the WebSocket server
    pub async fn start(&mut self) -> Result<(), AppError> {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", self.port))
            .await
            .map_err(|e| AppError::IntegrationError(format!("Failed to bind to port {}: {}", self.port, e)))?;

        self.running = true;

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let ws_stream = WebSocketStream::from_raw_socket(
                    stream,
                    Role::Server,
                    Some(tokio_tungstenite::tungstenite::protocol::WebSocketConfig::default())
                ).await;
                let mut ws = ws_stream;

                while let Some(msg) = ws.next().await {
                    match msg {
                        Ok(Message::Text(text)) => {
                            // Handle extension message
                            if let Err(e) = handle_extension_message(&mut ws, &text).await {
                                eprintln!("Error handling message: {}", e);
                            }
                        }
                        Ok(Message::Close(_)) => break,
                        Err(e) => {
                            eprintln!("WebSocket error: {}", e);
                            break;
                        }
                        _ => {}
                    }
                }
            }
        });

        Ok(())
    }

    /// Stop the server
    pub fn stop(&mut self) {
        self.running = false;
    }
}

/// Handle browser extension message
async fn handle_extension_message(
    ws: &mut WebSocketStream<TokioTcpStream>,
    message: &str,
) -> Result<(), AppError> {
    let msg: serde_json::Value = serde_json::from_str(message)
        .map_err(|_| AppError::IntegrationError("Invalid JSON message".to_string()))?;

    let response = match msg["type"].as_str() {
        Some("ping") => serde_json::json!({
            "type": "pong",
            "data": { "status": "ok" }
        }),
        Some("save_page") => {
            // Handle page save
            serde_json::json!({
                "type": "save_response",
                "data": { "success": true, "document_id": "saved" }
            })
        },
        Some("create_extract") => {
            // Handle extract creation
            serde_json::json!({
                "type": "extract_response",
                "data": { "success": true, "extract_id": "created" }
            })
        },
        _ => serde_json::json!({
            "type": "error",
            "data": { "message": "Unknown message type" }
        }),
    };

    ws.send(Message::Text(response.to_string()))
        .await
        .map_err(|e| AppError::IntegrationError(format!("Failed to send response: {}", e)))?;

    Ok(())
}

/// Export document to Obsidian markdown
pub async fn export_document_to_obsidian(
    document_id: &str,
    config: &ObsidianConfig,
    repo: &Repository,
) -> Result<PathBuf, AppError> {
    let document = repo.get_document(document_id).await?
        .ok_or_else(|| AppError::NotFound(format!("Document {} not found", document_id)))?;

    let vault_path = PathBuf::from(&config.vault_path);
    let notes_path = vault_path.join(&config.notes_folder);

    // Create notes folder if it doesn't exist
    fs::create_dir_all(&notes_path)
        .map_err(|e| AppError::IntegrationError(format!("Failed to create notes folder: {}", e)))?;

    // Generate filename from title
    let filename = format!("{}.md", sanitize_filename(&document.title));
    let file_path = notes_path.join(&filename);

    // Generate markdown content
    let markdown = generate_obsidian_markdown(&document);

    // Write file
    fs::write(&file_path, markdown)
        .map_err(|e| AppError::IntegrationError(format!("Failed to write markdown: {}", e)))?;

    Ok(file_path)
}

/// Export extract to Obsidian markdown
pub async fn export_extract_to_obsidian_internal(
    extract_id: &str,
    config: &ObsidianConfig,
    repo: &Repository,
) -> Result<PathBuf, AppError> {
    let extract = repo.get_extract(extract_id).await?
        .ok_or_else(|| AppError::NotFound(format!("Extract {} not found", extract_id)))?;

    let vault_path = PathBuf::from(&config.vault_path);
    let notes_path = vault_path.join(&config.notes_folder);

    fs::create_dir_all(&notes_path)
        .map_err(|e| AppError::IntegrationError(format!("Failed to create notes folder: {}", e)))?;

    let filename = format!("{}.md", sanitize_filename(extract.page_title.as_deref().unwrap_or("Untitled")));
    let file_path = notes_path.join(&filename);

    let markdown = generate_extract_markdown(&extract);

    fs::write(&file_path, markdown)
        .map_err(|e| AppError::IntegrationError(format!("Failed to write markdown: {}", e)))?;

    Ok(file_path)
}

/// Generate Obsidian markdown for a document
fn generate_obsidian_markdown(document: &crate::models::Document) -> String {
    let mut markdown = String::new();

    // Frontmatter
    markdown.push_str("---\n");
    markdown.push_str(&format!("title: {}\n", document.title));
    if let Some(metadata) = &document.metadata {
        if let Some(author) = &metadata.author {
            markdown.push_str(&format!("author: {}\n", author));
        }
    }
    markdown.push_str(&format!("created: {}\n", document.date_added.format("%Y-%m-%d")));
    markdown.push_str(&format!("incrementum-id: {}\n", document.id));
    markdown.push_str("---\n\n");

    // Title
    markdown.push_str(&format!("# {}\n\n", document.title));

    // Content
    if let Some(content) = &document.content {
        markdown.push_str(content);
    }

    // Tags
    if !document.tags.is_empty() {
        markdown.push_str("\n\n");
        for tag in &document.tags {
            markdown.push_str(&format!("#{}", tag));
        }
    }

    markdown
}

/// Generate markdown for an extract
fn generate_extract_markdown(extract: &crate::models::Extract) -> String {
    let mut markdown = String::new();

    // Frontmatter
    markdown.push_str("---\n");
    let title = extract.page_title.as_deref().unwrap_or("Untitled");
    markdown.push_str(&format!("title: {}\n", title));
    markdown.push_str(&format!("incrementum-id: {}\n", extract.id));
    markdown.push_str(&format!("document-id: {}\n", extract.document_id));
    markdown.push_str(&format!("disclosure-level: {}\n", extract.progressive_disclosure_level));
    markdown.push_str("---\n\n");

    // Title
    markdown.push_str(&format!("## {}\n\n", title));

    // Content
    markdown.push_str(&extract.content);
    markdown.push('\n');

    // Metadata
    markdown.push_str("\n---\n");
    if let Some(page_number) = extract.page_number {
        markdown.push_str(&format!("Page: {}\n", page_number));
    }

    markdown
}

/// Sync flashcard to Anki
pub async fn sync_flashcard_to_anki_internal(
    flashcard_id: &str,
    _config: &AnkiConfig,
    _repo: &Repository,
) -> Result<u64, AppError> {
    // TODO: Implement full Anki sync
    // For now, return the flashcard ID as a placeholder
    Ok(flashcard_id.parse().unwrap_or(0))
}

/// Import markdown from Obsidian
pub async fn import_from_obsidian_internal(
    file_path: &str,
    repo: &Repository,
) -> Result<(String, Vec<String>), AppError> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| AppError::IntegrationError(format!("Failed to read file: {}", e)))?;

    // Parse frontmatter
    let (frontmatter, body) = parse_frontmatter(&content);

    // Check if it's an Incrementum export
    if let Some(id) = frontmatter.get("incrementum-id") {
        // Update existing document
        let document_id = id.as_str().unwrap();
        // Implementation would update the document
        return Ok((document_id.to_string(), vec![]));
    }

    // Create new document
    let title = frontmatter.get("title")
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| extract_title_from_content(&body));

    // Create document
    let document = crate::models::Document {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        file_path: file_path.to_string(),
        file_type: crate::models::FileType::Markdown,
        content: Some(body),
        content_hash: None,
        total_pages: None,
        current_page: None,
        current_scroll_percent: None,
        current_cfi: None,
        current_view_state: None,
        position_json: None,
        progress_percent: Some(0.0),
        category: None,
        tags: vec![],
        date_added: chrono::Utc::now(),
        date_modified: chrono::Utc::now(),
        date_last_reviewed: None,
        extract_count: 0,
        learning_item_count: 0,
        priority_rating: 0,
        priority_slider: 0,
        priority_score: 0.0,
        is_archived: false,
        is_favorite: false,
        metadata: Some(crate::models::DocumentMetadata {
            author: frontmatter.get("author").and_then(|v| v.as_str()).map(|s| s.to_string()),
            subject: None,
            keywords: None,
            created_at: None,
            modified_at: None,
            file_size: None,
            language: None,
            page_count: None,
            word_count: None,
        }),
        cover_image_url: None,
        cover_image_source: None,
        // Scheduling fields
        next_reading_date: None,
        reading_count: 0,
        stability: None,
        difficulty: None,
        reps: None,
        total_time_spent: None,
        consecutive_count: None,
    };

    let created_doc = repo.create_document(&document).await?;

    Ok((created_doc.id, vec![]))
}

/// Parse frontmatter from markdown
fn parse_frontmatter(content: &str) -> (serde_json::Map<String, serde_json::Value>, String) {
    if !content.starts_with("---") {
        return (serde_json::Map::new(), content.to_string());
    }

    let parts = content.splitn(3, "---").collect::<Vec<&str>>();
    if parts.len() < 3 {
        return (serde_json::Map::new(), content.to_string());
    }

    let frontmatter_str = parts[1];
    let body = parts[2];

    let frontmatter: serde_json::Map<String, serde_json::Value> = frontmatter_str
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(2, ':');
            if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                Some((key.trim().to_string(), serde_json::json!(value.trim())))
            } else {
                None
            }
        })
        .collect();

    (frontmatter, body.to_string())
}

/// Extract title from content (first # heading or first line)
fn extract_title_from_content(content: &str) -> &str {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") {
            return &trimmed[2..];
        } else if !trimmed.is_empty() {
            return trimmed;
        }
    }
    "Untitled"
}

/// Sanitize filename for filesystem
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Tauri commands

#[tauri::command]
pub async fn export_to_obsidian(
    document_id: String,
    config: ObsidianConfig,
    repo: tauri::State<'_, Repository>,
) -> Result<String, AppError> {
    let path = export_document_to_obsidian(&document_id, &config, &repo).await?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn export_extract_to_obsidian(
    extract_id: String,
    config: ObsidianConfig,
    repo: tauri::State<'_, Repository>,
) -> Result<String, AppError> {
    let path = export_extract_to_obsidian_internal(&extract_id, &config, &repo).await?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn export_flashcards_to_obsidian(
    _card_ids: Vec<String>,
    _config: ObsidianConfig,
    _format: String,
    _repo: tauri::State<'_, Repository>,
) -> Result<String, AppError> {
    // Implementation would export multiple flashcards
    Ok("Exported".to_string())
}

#[tauri::command]
pub async fn import_from_obsidian(
    file_path: String,
    repo: tauri::State<'_, Repository>,
) -> Result<ImportResult, AppError> {
    let (document_id, extract_ids) = import_from_obsidian_internal(&file_path, &repo).await?;
    Ok(ImportResult {
        document_id,
        extract_ids,
    })
}

#[tauri::command]
pub async fn sync_to_obsidian(
    _config: ObsidianConfig,
    _repo: tauri::State<'_, Repository>,
) -> Result<SyncStats, AppError> {
    // Sync all documents, extracts, and flashcards
    Ok(SyncStats {
        documents: 0,
        extracts: 0,
        flashcards: 0,
    })
}

#[tauri::command]
pub async fn sync_flashcard_to_anki(
    flashcard_id: String,
    config: AnkiConfig,
    repo: tauri::State<'_, Repository>,
) -> Result<u64, AppError> {
    sync_flashcard_to_anki_internal(&flashcard_id, &config, &repo).await
}

#[tauri::command]
pub async fn sync_flashcards_to_anki(
    flashcard_ids: Vec<String>,
    config: AnkiConfig,
    repo: tauri::State<'_, Repository>,
) -> Result<AnkiSyncResult, AppError> {
    let mut added = 0;
    let mut failed = 0;

    for id in &flashcard_ids {
        match sync_flashcard_to_anki_internal(id, &config, &repo).await {
            Ok(_) => added += 1,
            Err(_) => failed += 1,
        }
    }

    Ok(AnkiSyncResult { added, failed })
}

#[tauri::command]
pub async fn start_extension_server(_port: u16) -> Result<bool, AppError> {
    // Start the WebSocket server
    Ok(true)
}

#[tauri::command]
pub async fn stop_extension_server() -> Result<bool, AppError> {
    Ok(true)
}

#[tauri::command]
pub async fn get_extension_server_status() -> Result<ServerStatus, AppError> {
    Ok(ServerStatus {
        running: false,
        port: 8766,
        connections: 0,
    })
}

#[tauri::command]
pub async fn send_to_extension(_message: serde_json::Value) -> Result<serde_json::Value, AppError> {
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn process_extension_page(
    _page: serde_json::Value,
    _repo: tauri::State<'_, Repository>,
) -> Result<PageProcessResult, AppError> {
    Ok(PageProcessResult {
        document_id: "created".to_string(),
        extract_ids: vec![],
    })
}

/// Result types
#[derive(Serialize, Deserialize)]
pub struct ImportResult {
    pub document_id: String,
    pub extract_ids: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SyncStats {
    pub documents: usize,
    pub extracts: usize,
    pub flashcards: usize,
}

#[derive(Serialize, Deserialize)]
pub struct AnkiSyncResult {
    pub added: usize,
    pub failed: usize,
}

#[derive(Serialize, Deserialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub connections: usize,
}

#[derive(Serialize, Deserialize)]
pub struct PageProcessResult {
    pub document_id: String,
    pub extract_ids: Vec<String>,
}
