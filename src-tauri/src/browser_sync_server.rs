//! Browser Sync Server
//!
//! HTTP server for receiving data from the browser extension.
//! The extension sends POST requests with page/extract/video data.
//! Also provides AI endpoints for summarization and content analysis.

use crate::ai::{AIConfig, AIProvider, LLMProviderType};
use crate::ai::summarizer::Summarizer;
use crate::ai::qa::QuestionAnswerer;
use crate::ai::flashcard_generator::{FlashcardGenerator, FlashcardGenerationOptions};
use crate::commands::rss::{
    fetch_rss_feed_url,
    RssFeed,
    RssUserPreference,
    RssUserPreferenceUpdate,
    create_rss_feed_http,
    get_rss_feeds_http,
    get_rss_feed_http,
    update_rss_feed_http,
    delete_rss_feed_http,
    get_rss_articles_http,
    mark_rss_article_read_http,
    toggle_rss_article_queued_http,
};
use crate::database::Repository;
use crate::error::AppError;
use crate::models::{Document, FileType, Extract};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
    routing::{get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::{
    cors::CorsLayer,
    limit::RequestBodyLimitLayer,
};
use tracing::{info, error, warn};

/// Maximum payload size (10MB)
const MAX_PAYLOAD_SIZE: usize = 10 * 1024 * 1024;

/// Server state shared across handlers
#[derive(Clone)]
pub struct ServerState {
    pub repo: Arc<Repository>,
    pub running: Arc<Mutex<bool>>,
    pub ai_config: Arc<Mutex<Option<AIConfig>>>,
}

/// Server status for Tauri commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub connections: usize,
}

/// Server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserSyncConfig {
    pub host: String,
    pub port: u16,
    #[serde(default)]
    pub auto_start: bool,
}

impl Default for BrowserSyncConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8766,
            auto_start: false,
        }
    }
}

/// Extension request payload from browser
#[derive(Debug, Deserialize)]
pub struct ExtensionRequest {
    pub url: String,
    pub title: String,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub r#type: String, // "page", "extract", "video"
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub timestamp: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub priority: Option<i32>,
    #[serde(default)]
    pub analysis: Option<serde_json::Value>,
    #[serde(default)]
    pub fsrs_data: Option<serde_json::Value>,
    #[serde(default)]
    pub test: Option<bool>,
}

/// Response to browser extension
#[derive(Debug, Serialize)]
pub struct ExtensionResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extract_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// AI request from browser extension
#[derive(Debug, Deserialize)]
pub struct AIRequest {
    /// Content to process
    pub content: String,
    /// Type of AI operation: "summarize", "key-points", "flashcards", "questions"
    #[serde(default = "default_ai_operation")]
    pub operation: String,
    /// Max words for summary (default: 150)
    #[serde(default = "default_max_words")]
    pub max_words: usize,
    /// Count for key points/questions/flashcards (default: 5)
    #[serde(default = "default_count")]
    pub count: usize,
    /// Page URL for context
    #[serde(default)]
    pub url: Option<String>,
    /// Page title for context
    #[serde(default)]
    pub title: Option<String>,
}

fn default_ai_operation() -> String { "summarize".to_string() }
fn default_max_words() -> usize { 150 }
fn default_count() -> usize { 5 }

/// Generated flashcard for browser extension
#[derive(Debug, Clone, Serialize)]
pub struct GeneratedFlashcard {
    pub question: String,
    pub answer: String,
    pub card_type: String,
}

/// AI response to browser extension
#[derive(Debug, Serialize)]
pub struct AIResponse {
    pub success: bool,
    /// Summary of the content
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    /// Key points extracted
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_points: Option<Vec<String>>,
    /// Generated flashcards
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flashcards: Option<Vec<GeneratedFlashcard>>,
    /// Generated questions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub questions: Option<Vec<String>>,
    /// Reading time estimate in minutes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading_time_minutes: Option<u32>,
    /// Word count
    #[serde(skip_serializing_if = "Option::is_none")]
    pub word_count: Option<u32>,
    /// Complexity score (1-10)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub complexity_score: Option<u8>,
    /// Error message if any
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// AI status response
#[derive(Debug, Serialize)]
pub struct AIStatusResponse {
    pub configured: bool,
    pub provider: Option<String>,
    pub model: Option<String>,
}

/// RSS feed creation request
#[derive(Debug, Deserialize)]
pub struct CreateFeedRequest {
    pub url: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub update_interval: Option<i32>,
    #[serde(default)]
    pub auto_queue: Option<bool>,
}

/// RSS feed update request
#[derive(Debug, Deserialize)]
pub struct UpdateFeedRequest {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub update_interval: Option<i32>,
    #[serde(default)]
    pub auto_queue: Option<bool>,
    #[serde(default)]
    pub is_active: Option<bool>,
}

/// RSS feed response with unread count
#[derive(Debug, Clone, Serialize)]
pub struct FeedResponse {
    #[serde(flatten)]
    pub feed: RssFeed,
    pub unread_count: i32,
}

/// OPML import request
#[derive(Debug, Deserialize)]
pub struct OpmlImportRequest {
    pub opml_content: String,
}

/// OPML export response
#[derive(Debug, Serialize)]
pub struct OpmlExportResponse {
    pub opml_content: String,
}

/// Document progress update request
#[derive(Debug, Deserialize)]
pub struct UpdateProgressRequest {
    pub current_page: Option<i32>,
    pub current_scroll_percent: Option<f64>,
    pub current_cfi: Option<String>,
}

/// Document response
#[derive(Debug, Serialize)]
pub struct DocumentResponse {
    pub id: String,
    pub title: String,
    pub file_path: String,
    pub file_type: String,
    pub current_page: Option<i32>,
    pub current_scroll_percent: Option<f64>,
    pub current_cfi: Option<String>,
    pub total_pages: Option<i32>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub date_added: String,
    pub date_modified: String,
}

/// Global server handle for shutdown
static SERVER_HANDLE: Mutex<Option<tokio::task::JoinHandle<()>>> = Mutex::const_new(None);

/// Start the HTTP server for browser extension
pub async fn start_server(
    config: BrowserSyncConfig,
    repo: Arc<Repository>,
    ai_config: Option<AIConfig>,
) -> Result<(), AppError> {
    // Check if server is already running
    let mut handle = SERVER_HANDLE.lock().await;
    if handle.is_some() {
        return Err(AppError::IntegrationError(
            "Browser extension server is already running".to_string(),
        ));
    }

    let addr = format!("{}:{}", config.host, config.port);
    let addr: SocketAddr = addr
        .parse()
        .map_err(|e| AppError::IntegrationError(format!("Invalid address: {}", e)))?;

    // Create server state
    let running = Arc::new(Mutex::new(true));
    let state = ServerState {
        repo: repo.clone(),
        running: running.clone(),
        ai_config: Arc::new(Mutex::new(ai_config)),
    };

    // Build router with AI, RSS, and Document endpoints
    let app = Router::new()
        // Extension/AI endpoints
        .route("/", post(handle_extension_request))
        .route("/ai/process", post(handle_ai_request))
        .route("/ai/status", get(handle_ai_status))
        // RSS feed endpoints
        .route("/api/rss/feeds", post(handle_create_feed).get(handle_list_feeds))
        .route("/api/rss/feeds/:id", get(handle_get_feed).put(handle_update_feed).delete(handle_delete_feed))
        .route("/api/rss/feeds/:id/articles", get(handle_get_feed_articles))
        .route("/api/rss/articles/:id", post(handle_mark_article))
        .route("/api/rss/articles/:id/queued", post(handle_toggle_article_queued))
        .route("/api/rss/fetch", get(handle_fetch_feed_url))
        .route("/api/rss/opml/import", post(handle_opml_import))
        .route("/api/rss/opml/export", get(handle_opml_export))
        .route("/api/rss/preferences", get(handle_get_preferences).put(handle_set_preferences))
        // Document progress endpoints
        .route("/api/documents/:id", get(handle_get_document))
        .route("/api/documents/:id/progress", post(handle_update_progress))
        .layer(CorsLayer::permissive())
        .layer(RequestBodyLimitLayer::new(MAX_PAYLOAD_SIZE))
        .with_state(state);

    info!("Starting browser extension server on {}", addr);

    // Spawn server task
    let task = tokio::spawn(async move {
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to bind to {}: {}", addr, e);
                let mut r = running.lock().await;
                *r = false;
                return;
            }
        };

        info!("Browser extension server listening on {}", addr);

        // Serve with graceful shutdown
        if let Err(e) = axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal(running.clone()))
            .await
        {
            error!("Server error: {}", e);
        }

        info!("Browser extension server stopped");
    });

    *handle = Some(task);
    drop(handle);

    Ok(())
}

/// Signal handler for graceful shutdown
async fn shutdown_signal(running: Arc<Mutex<bool>>) {
    // Wait until running is set to false
    loop {
        let r = *running.lock().await;
        if !r {
            break;
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
}

/// Stop the HTTP server
pub async fn stop_server() -> Result<(), AppError> {
    let mut handle = SERVER_HANDLE.lock().await;
    if handle.is_none() {
        return Err(AppError::IntegrationError(
            "Browser extension server is not running".to_string(),
        ));
    }

    // Signal shutdown by setting running to false
    // Note: The running flag is managed by the ServerState, which we don't have direct access to here
    // The server task will exit when the handle is aborted
    if let Some(task) = handle.take() {
        task.abort();
    }

    Ok(())
}

/// Get current server status
pub async fn get_status(config: BrowserSyncConfig) -> ServerStatus {
    let handle = SERVER_HANDLE.lock().await;
    let running = handle.is_some();

    ServerStatus {
        running,
        port: config.port,
        connections: 0, // Could be tracked with an atomic counter if needed
    }
}

/// Handle incoming POST request from browser extension
async fn handle_extension_request(
    State(state): State<ServerState>,
    Json(payload): Json<ExtensionRequest>,
) -> Response {
    info!(
        "Received extension request: type={}, url={}",
        payload.r#type, payload.url
    );

    // Check if this is a connection test
    if payload.test.unwrap_or(false) {
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Server is running"
            })),
        )
            .into_response();
    }

    // Validate required fields
    if payload.url.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Missing required field: url");
    }

    // Route to appropriate handler based on type field
    let result = match payload.r#type.as_str() {
        "extract" => handle_extract_request(&state, &payload).await,
        "video" => handle_import_request(&state, &payload, FileType::Youtube).await,
        _ => handle_import_request(&state, &payload, FileType::Other).await,
    };

    match result {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => {
            error!("Error handling extension request: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle general document import request (page or video)
async fn handle_import_request(
    state: &ServerState,
    payload: &ExtensionRequest,
    file_type: FileType,
) -> Result<ExtensionResponse, AppError> {
    // Check if document with this URL already exists
    let existing = state
        .repo
        .find_document_by_url(&payload.url)
        .await
        .ok();

    if let Some(doc) = existing {
        info!(
            "Document already exists for URL: {}, returning existing doc",
            payload.url
        );
        return Ok(ExtensionResponse {
            success: true,
            document_id: Some(doc.unwrap().id),
            extract_id: None,
            error: None,
        });
    }

    // Fetch content if not provided
    // For YouTube, we skip fetching raw HTML content as it's not useful for reading
    let content = if payload.text.is_empty() {
        if matches!(file_type, FileType::Youtube) {
            String::new()
        } else {
            info!("No content provided, fetching from URL: {}", payload.url);
            match fetch_page_content(&payload.url).await {
                Ok(c) => c,
                Err(e) => {
                    warn!("Failed to fetch content from {}: {}", payload.url, e);
                    // Continue without content - will create document with URL and title only
                    String::new()
                }
            }
        }
    } else {
        payload.text.clone()
    };

    let category = if matches!(file_type, FileType::Youtube) { Some("YouTube Videos".to_string()) } else { None };

    // Create document
    let document = Document {
        id: uuid::Uuid::new_v4().to_string(),
        title: payload.title.clone(),
        file_path: payload.url.clone(),
        file_type,
        content: Some(content),
        content_hash: None,
        total_pages: None,
        current_page: None,
        category,
        tags: payload.tags.clone().unwrap_or_default(),
        date_added: chrono::Utc::now(),
        date_modified: chrono::Utc::now(),
        date_last_reviewed: None,
        extract_count: 0,
        learning_item_count: 0,
        priority_rating: payload.priority.unwrap_or(0),
        priority_slider: payload.priority.unwrap_or(0),
        priority_score: payload.priority.unwrap_or(0) as f64,
        is_archived: false,
        is_favorite: false,
        metadata: None,
        next_reading_date: None,
        reading_count: 0,
        stability: None,
        difficulty: None,
        reps: None,
        total_time_spent: None,
        consecutive_count: None,
    };

    let created = state.repo.create_document(&document).await?;
    info!(
        "Created document for URL: {} with id: {}",
        payload.url, created.id
    );

    Ok(ExtensionResponse {
        success: true,
        document_id: Some(created.id),
        extract_id: None,
        error: None,
    })
}

/// Handle extract save request
async fn handle_extract_request(
    state: &ServerState,
    payload: &ExtensionRequest,
) -> Result<ExtensionResponse, AppError> {
    // Find or create document for this URL
    let document_id = if let Ok(Some(doc)) = state.repo.find_document_by_url(&payload.url).await {
        doc.id
    } else {
        // Create a minimal document for this URL
        let document = Document {
            id: uuid::Uuid::new_v4().to_string(),
            title: payload.title.clone(),
            file_path: payload.url.clone(),
            file_type: FileType::Other,
            content: None,
            content_hash: None,
            total_pages: None,
            current_page: None,
            category: None,
            tags: payload.tags.clone().unwrap_or_default(),
            date_added: chrono::Utc::now(),
            date_modified: chrono::Utc::now(),
            date_last_reviewed: None,
            extract_count: 0,
            learning_item_count: 0,
            priority_rating: payload.priority.unwrap_or(0),
            priority_slider: payload.priority.unwrap_or(0),
            priority_score: payload.priority.unwrap_or(0) as f64,
            is_archived: false,
            is_favorite: false,
            metadata: None,
            next_reading_date: None,
            reading_count: 0,
            stability: None,
            difficulty: None,
            reps: None,
            total_time_spent: None,
            consecutive_count: None,
        };

        let created = state.repo.create_document(&document).await?;
        info!(
            "Created document for extract URL: {} with id: {}",
            payload.url, created.id
        );
        created.id
    };

    // Create extract
    let extract = Extract {
        id: uuid::Uuid::new_v4().to_string(),
        document_id: document_id.clone(),
        content: payload.text.clone(),
        page_title: Some(payload.title.clone()),
        page_number: None,
        highlight_color: None,
        notes: payload.context.clone(), // Store context in notes
        progressive_disclosure_level: 0,
        max_disclosure_level: 3,
        date_created: chrono::Utc::now(),
        date_modified: chrono::Utc::now(),
        tags: payload.tags.clone().unwrap_or_default(),
        category: None,
        memory_state: None,
        next_review_date: None,
        last_review_date: None,
        review_count: 0,
        reps: 0,
    };

    let created = state.repo.create_extract(&extract).await?;
    info!(
        "Created extract for document: {} with extract id: {}",
        document_id, created.id
    );

    Ok(ExtensionResponse {
        success: true,
        document_id: Some(document_id),
        extract_id: Some(created.id),
        error: None,
    })
}

/// Fetch page content from URL
async fn fetch_page_content(url: &str) -> Result<String, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| AppError::IntegrationError(format!("Failed to create HTTP client: {}", e)))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::IntegrationError(format!("Failed to fetch URL: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::IntegrationError(format!(
            "HTTP error: {}",
            response.status()
        )));
    }

    let html = response
        .text()
        .await
        .map_err(|e| AppError::IntegrationError(format!("Failed to read response: {}", e)))?;

    // Extract text content from HTML
    Ok(extract_text_from_html(&html))
}

/// Extract readable text from HTML
fn extract_text_from_html(html: &str) -> String {
    // Simple HTML tag removal and text extraction
    // This is basic - could be enhanced with readability algorithm
    let text = regex::Regex::new(r"<script[^>]*>.*?</script>")
        .unwrap()
        .replace_all(html, "")
        .to_string();

    let text = regex::Regex::new(r"<style[^>]*>.*?</style>")
        .unwrap()
        .replace_all(&text, "")
        .to_string();

    let text = regex::Regex::new(r"<[^>]+>")
        .unwrap()
        .replace_all(&text, " ")
        .to_string();

    // Clean up whitespace
    text.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

/// Create error response
fn error_response(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(ExtensionResponse {
            success: false,
            document_id: None,
            extract_id: None,
            error: Some(message.to_string()),
        }),
    )
        .into_response()
}

/// Calculate reading time in minutes (average 200 words per minute)
fn calculate_reading_time(content: &str) -> u32 {
    let word_count = content.split_whitespace().count();
    ((word_count as f64 / 200.0).ceil() as u32).max(1)
}

/// Calculate word count
fn calculate_word_count(content: &str) -> u32 {
    content.split_whitespace().count() as u32
}

/// Estimate complexity score (1-10) based on simple heuristics
fn estimate_complexity(content: &str) -> u8 {
    let words: Vec<&str> = content.split_whitespace().collect();
    let word_count = words.len();
    
    if word_count == 0 {
        return 1;
    }
    
    // Average word length as a simple proxy for complexity
    let avg_word_len: f64 = words.iter().map(|w| w.len()).sum::<usize>() as f64 / word_count as f64;
    
    // Sentence count (rough estimate)
    let sentence_count = content.matches('.').count() + content.matches('!').count() + content.matches('?').count();
    let avg_sentence_len = if sentence_count > 0 { word_count / sentence_count } else { word_count };
    
    // Score based on word length and sentence length
    let complexity = ((avg_word_len - 3.0) * 1.5 + (avg_sentence_len as f64 - 10.0) * 0.2).clamp(1.0, 10.0);
    complexity as u8
}

/// Handle AI request from browser extension
async fn handle_ai_request(
    State(state): State<ServerState>,
    Json(payload): Json<AIRequest>,
) -> Response {
    info!(
        "Received AI request: operation={}, content_length={}",
        payload.operation,
        payload.content.len()
    );

    // Get AI config
    let ai_config = {
        let config_guard = state.ai_config.lock().await;
        config_guard.clone()
    };

    let config = match ai_config {
        Some(c) => c,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(AIResponse {
                    success: false,
                    summary: None,
                    key_points: None,
                    flashcards: None,
                    questions: None,
                    reading_time_minutes: None,
                    word_count: None,
                    complexity_score: None,
                    error: Some("AI is not configured. Please configure an AI provider in the desktop app settings.".to_string()),
                }),
            ).into_response();
        }
    };

    // Create AI provider
    let provider = match AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    ) {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AIResponse {
                    success: false,
                    summary: None,
                    key_points: None,
                    flashcards: None,
                    questions: None,
                    reading_time_minutes: None,
                    word_count: None,
                    complexity_score: None,
                    error: Some(format!("Failed to create AI provider: {}", e)),
                }),
            ).into_response();
        }
    };

    // Calculate content stats
    let reading_time = calculate_reading_time(&payload.content);
    let word_count = calculate_word_count(&payload.content);
    let complexity = estimate_complexity(&payload.content);

    // Process based on operation type
    let mut response = AIResponse {
        success: true,
        summary: None,
        key_points: None,
        flashcards: None,
        questions: None,
        reading_time_minutes: Some(reading_time),
        word_count: Some(word_count),
        complexity_score: Some(complexity),
        error: None,
    };

    match payload.operation.as_str() {
        "summarize" => {
            let summarizer = Summarizer::new(provider);
            match summarizer.summarize(&payload.content, payload.max_words).await {
                Ok(summary) => {
                    response.summary = Some(summary);
                }
                Err(e) => {
                    response.success = false;
                    response.error = Some(format!("Summarization failed: {}", e));
                }
            }
        }
        "key-points" => {
            let summarizer = Summarizer::new(provider);
            match summarizer.extract_key_points(&payload.content, payload.count).await {
                Ok(points) => {
                    response.key_points = Some(points);
                }
                Err(e) => {
                    response.success = false;
                    response.error = Some(format!("Key points extraction failed: {}", e));
                }
            }
        }
        "flashcards" => {
            let generator = FlashcardGenerator::new(provider);
            let options = FlashcardGenerationOptions {
                count: payload.count,
                ..Default::default()
            };
            match generator.generate_from_content(&payload.content, &options).await {
                Ok(cards) => {
                    response.flashcards = Some(
                        cards.into_iter().map(|c| GeneratedFlashcard {
                            question: c.question,
                            answer: c.answer,
                            card_type: format!("{:?}", c.card_type),
                        }).collect()
                    );
                }
                Err(e) => {
                    response.success = false;
                    response.error = Some(format!("Flashcard generation failed: {}", e));
                }
            }
        }
        "questions" => {
            let qa = QuestionAnswerer::new(provider);
            match qa.generate_questions(&payload.content, payload.count).await {
                Ok(questions) => {
                    response.questions = Some(questions);
                }
                Err(e) => {
                    response.success = false;
                    response.error = Some(format!("Question generation failed: {}", e));
                }
            }
        }
        "all" => {
            // Get all AI features at once - create separate providers for each operation
            let summarizer = Summarizer::new(provider);
            
            // Run summarization
            if let Ok(summary) = summarizer.summarize(&payload.content, payload.max_words).await {
                response.summary = Some(summary);
            }
            
            // Run key points extraction
            if let Ok(points) = summarizer.extract_key_points(&payload.content, payload.count).await {
                response.key_points = Some(points);
            }
            
            // Create new provider for questions
            if let Ok(qa_provider) = AIProvider::from_config(
                config.default_provider,
                &config.api_keys,
                &config.models,
                &config.local_settings,
            ) {
                let qa = QuestionAnswerer::new(qa_provider);
                if let Ok(questions) = qa.generate_questions(&payload.content, 3).await {
                    response.questions = Some(questions);
                }
            }
        }
        _ => {
            response.success = false;
            response.error = Some(format!("Unknown operation: {}", payload.operation));
        }
    }

    (StatusCode::OK, Json(response)).into_response()
}

/// Handle AI status check from browser extension
async fn handle_ai_status(
    State(state): State<ServerState>,
) -> Response {
    let ai_config = {
        let config_guard = state.ai_config.lock().await;
        config_guard.clone()
    };

    let response = match ai_config {
        Some(config) => {
            let provider_name = format!("{:?}", config.default_provider);
            let model = match config.default_provider {
                LLMProviderType::OpenAI => Some(config.models.openai_model.clone()),
                LLMProviderType::Anthropic => Some(config.models.anthropic_model.clone()),
                LLMProviderType::OpenRouter => Some(config.models.openrouter_model.clone()),
                LLMProviderType::Ollama => Some(config.models.ollama_model.clone()),
            };
            
            AIStatusResponse {
                configured: true,
                provider: Some(provider_name),
                model,
            }
        }
        None => AIStatusResponse {
            configured: false,
            provider: None,
            model: None,
        },
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// ============================================================================
/// RSS API Handlers
/// ============================================================================

/// Handle RSS feed creation
async fn handle_create_feed(
    State(state): State<ServerState>,
    Json(payload): Json<CreateFeedRequest>,
) -> Response {
    match create_rss_feed_http(
        payload.url,
        payload.title,
        payload.description,
        payload.category,
        payload.update_interval,
        payload.auto_queue,
        &state.repo,
    ).await {
        Ok(feed) => {
            let unread_count = state.repo.get_rss_feed_unread_count(&feed.id).await.unwrap_or(0);
            let response = FeedResponse {
                feed,
                unread_count,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            error!("Failed to create RSS feed: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle listing all RSS feeds
async fn handle_list_feeds(
    State(state): State<ServerState>,
) -> Response {
    match get_rss_feeds_http(&state.repo).await {
        Ok(feeds) => {
            let mut responses = Vec::new();
            for feed in feeds {
                let unread_count = state.repo.get_rss_feed_unread_count(&feed.id).await.unwrap_or(0);
                responses.push(FeedResponse {
                    feed,
                    unread_count,
                });
            }
            (StatusCode::OK, Json(responses)).into_response()
        }
        Err(e) => {
            error!("Failed to list RSS feeds: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle getting a specific RSS feed
async fn handle_get_feed(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    match get_rss_feed_http(&id, &state.repo).await {
        Ok(Some(feed)) => {
            let unread_count = state.repo.get_rss_feed_unread_count(&feed.id).await.unwrap_or(0);
            let response = FeedResponse {
                feed,
                unread_count,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Ok(None) => error_response(StatusCode::NOT_FOUND, "Feed not found"),
        Err(e) => {
            error!("Failed to get RSS feed: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle updating an RSS feed
async fn handle_update_feed(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<UpdateFeedRequest>,
) -> Response {
    match update_rss_feed_http(
        &id,
        payload.title,
        payload.description,
        payload.category,
        payload.update_interval,
        payload.auto_queue,
        payload.is_active,
        &state.repo,
    ).await {
        Ok(feed) => {
            let unread_count = state.repo.get_rss_feed_unread_count(&feed.id).await.unwrap_or(0);
            let response = FeedResponse {
                feed,
                unread_count,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            error!("Failed to update RSS feed: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle deleting an RSS feed
async fn handle_delete_feed(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    match delete_rss_feed_http(&id, &state.repo).await {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({"success": true}))).into_response(),
        Err(e) => {
            error!("Failed to delete RSS feed: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle getting articles for a feed
async fn handle_get_feed_articles(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Response {
    let limit = params.get("limit").and_then(|l| l.parse::<i32>().ok());
    let feed_id = if id == "all" { None } else { Some(id.clone()) };

    match get_rss_articles_http(feed_id.as_deref(), limit, &state.repo).await {
        Ok(articles) => (StatusCode::OK, Json(articles)).into_response(),
        Err(e) => {
            error!("Failed to get RSS articles: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle marking an article as read/unread
async fn handle_mark_article(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Response {
    let is_read = params.get("read")
        .and_then(|r| r.parse::<bool>().ok())
        .unwrap_or(true);

    match mark_rss_article_read_http(&id, is_read, &state.repo).await {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({"success": true}))).into_response(),
        Err(e) => {
            error!("Failed to mark article: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle toggling article queued status
async fn handle_toggle_article_queued(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    match toggle_rss_article_queued_http(&id, &state.repo).await {
        Ok(queued) => (StatusCode::OK, Json(serde_json::json!({"success": true, "queued": queued}))).into_response(),
        Err(e) => {
            error!("Failed to toggle article queued: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle fetching and parsing a feed URL (without subscribing)
async fn handle_fetch_feed_url(
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Response {
    let url = match params.get("url") {
        Some(u) => u.clone(),
        None => return error_response(StatusCode::BAD_REQUEST, "Missing url parameter"),
    };

    match fetch_rss_feed_url(url).await {
        Ok(parsed_feed) => (StatusCode::OK, Json(parsed_feed)).into_response(),
        Err(e) => {
            error!("Failed to fetch feed URL: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle OPML import
async fn handle_opml_import(
    State(state): State<ServerState>,
    Json(payload): Json<OpmlImportRequest>,
) -> Response {
    // Parse OPML content
    let parsed_feeds = match parse_opml_content(&payload.opml_content) {
        Ok(feeds) => feeds,
        Err(e) => {
            return error_response(StatusCode::BAD_REQUEST, &format!("Failed to parse OPML: {}", e));
        }
    };

    let mut imported_count = 0;
    let mut errors = Vec::new();

    for feed_data in parsed_feeds {
        let title = feed_data.title.clone();
        match create_rss_feed_http(
            feed_data.url,
            feed_data.title,
            feed_data.description,
            feed_data.category,
            feed_data.update_interval,
            feed_data.auto_queue,
            &state.repo,
        ).await {
            Ok(_) => imported_count += 1,
            Err(e) => errors.push(format!("Failed to import {}: {}", title, e)),
        }
    }

    (StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "imported": imported_count,
        "errors": errors
    }))).into_response()
}

/// Handle OPML export
async fn handle_opml_export(
    State(state): State<ServerState>,
) -> Response {
    match get_rss_feeds_http(&state.repo).await {
        Ok(feeds) => {
            let opml_content = generate_opml_content(&feeds);
            let response = OpmlExportResponse { opml_content };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            error!("Failed to export feeds: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Parsed feed data from OPML
#[derive(Debug)]
struct OpmlFeedData {
    url: String,
    title: String,
    description: Option<String>,
    category: Option<String>,
    update_interval: Option<i32>,
    auto_queue: Option<bool>,
}

/// Parse OPML content and extract feed data
fn parse_opml_content(content: &str) -> Result<Vec<OpmlFeedData>, String> {
    use roxmltree::Document;

    let doc = Document::parse(content)
        .map_err(|e| format!("Failed to parse OPML XML: {}", e))?;

    let mut feeds = Vec::new();

    // Find all outline elements (RSS feeds in OPML)
    for node in doc.descendants() {
        if node.tag_name().name() == "outline" {
            if let Some(url) = node.attribute("xmlUrl").or_else(|| node.attribute("htmlUrl")) {
                let title = node.attribute("title")
                    .or_else(|| node.attribute("text"))
                    .unwrap_or("Unknown Feed")
                    .to_string();

                feeds.push(OpmlFeedData {
                    url: url.to_string(),
                    title,
                    description: node.attribute("description").map(|s| s.to_string()),
                    category: node.attribute("category").map(|s| s.to_string()),
                    update_interval: None,
                    auto_queue: None,
                });
            }
        }
    }

    Ok(feeds)
}

/// Generate OPML content from feeds
fn generate_opml_content(feeds: &[RssFeed]) -> String {
    let mut opml = String::from(r#"<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Incrementum RSS Feeds</title>
    <dateCreated>"#);

    opml.push_str(&chrono::Utc::now().to_rfc3339());
    opml.push_str(r#"</dateCreated>
  </head>
  <body>
"#);

    for feed in feeds {
        opml.push_str(r#"    <outline type="rss""#);
        opml.push_str(&format!(" xmlUrl=\"{}\"", feed.url));
        opml.push_str(&format!(" title=\"{}\"", escape_xml(&feed.title)));
        opml.push_str(&format!(" text=\"{}\"", escape_xml(&feed.title)));
        if let Some(desc) = &feed.description {
            opml.push_str(&format!(" description=\"{}\"", escape_xml(desc)));
        }
        if let Some(category) = &feed.category {
            opml.push_str(&format!(" category=\"{}\"", escape_xml(category)));
        }
        opml.push_str("/>\n");
    }

    opml.push_str(r#"  </body>
</opml>"#);

    opml
}

/// Escape XML special characters
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

// ============================================================================
// RSS User Preferences API Handlers
// ============================================================================

/// Request to get RSS user preferences
#[derive(Debug, Deserialize)]
pub struct GetPreferencesRequest {
    pub feed_id: Option<String>,
    pub user_id: Option<String>,
}

/// Handle getting RSS user preferences
async fn handle_get_preferences(
    State(state): State<ServerState>,
    Query(params): Query<GetPreferencesRequest>,
) -> Response {
    let feed_id = params.feed_id.as_deref();
    let user_id = params.user_id.as_deref();

    match state.repo.get_rss_user_preferences(feed_id, user_id).await {
        Ok(Some(prefs)) => (StatusCode::OK, Json(prefs)).into_response(),
        Ok(None) => {
            // Return default preferences if none exist
            let defaults = RssUserPreference {
                id: uuid::Uuid::new_v4().to_string(),
                user_id: user_id.map(|s| s.to_string()),
                feed_id: feed_id.map(|s| s.to_string()),
                keyword_include: None,
                keyword_exclude: None,
                author_whitelist: None,
                author_blacklist: None,
                category_filter: None,
                view_mode: Some("card".to_string()),
                theme_mode: Some("system".to_string()),
                density: Some("normal".to_string()),
                column_count: Some(2),
                show_thumbnails: Some(true),
                excerpt_length: Some(150),
                show_author: Some(true),
                show_date: Some(true),
                show_feed_icon: Some(true),
                sort_by: Some("date".to_string()),
                sort_order: Some("desc".to_string()),
                date_created: chrono::Utc::now().to_rfc3339(),
                date_modified: chrono::Utc::now().to_rfc3339(),
            };
            (StatusCode::OK, Json(defaults)).into_response()
        }
        Err(e) => {
            error!("Failed to get RSS preferences: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle setting RSS user preferences
async fn handle_set_preferences(
    State(state): State<ServerState>,
    Query(params): Query<GetPreferencesRequest>,
    Json(prefs): Json<RssUserPreferenceUpdate>,
) -> Response {
    let feed_id = params.feed_id.as_deref();
    let user_id = params.user_id.as_deref();

    match state.repo.set_rss_user_preferences(feed_id, user_id, prefs).await {
        Ok(updated_prefs) => (StatusCode::OK, Json(updated_prefs)).into_response(),
        Err(e) => {
            error!("Failed to set RSS preferences: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

// ============================================================================
// Document Progress API Handlers
// ============================================================================

/// Handle getting a document by ID
async fn handle_get_document(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    use crate::database::Repository;

    match state.repo.get_document(&id).await {
        Ok(Some(doc)) => {
            let response = DocumentResponse {
                id: doc.id,
                title: doc.title,
                file_path: doc.file_path,
                file_type: format!("{:?}", doc.file_type),
                current_page: doc.current_page,
                current_scroll_percent: doc.current_scroll_percent,
                current_cfi: doc.current_cfi,
                total_pages: doc.total_pages,
                content: doc.content,
                category: doc.category,
                tags: doc.tags,
                date_added: doc.date_added.to_rfc3339(),
                date_modified: doc.date_modified.to_rfc3339(),
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Ok(None) => error_response(StatusCode::NOT_FOUND, "Document not found"),
        Err(e) => {
            error!("Failed to get document: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Handle updating document progress
async fn handle_update_progress(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<UpdateProgressRequest>,
) -> Response {
    use crate::database::Repository;

    match state
        .repo
        .update_document_progress(&id, payload.current_page, payload.current_scroll_percent, payload.current_cfi)
        .await
    {
        Ok(updated_doc) => {
            let response = DocumentResponse {
                id: updated_doc.id,
                title: updated_doc.title,
                file_path: updated_doc.file_path,
                file_type: format!("{:?}", updated_doc.file_type),
                current_page: updated_doc.current_page,
                current_scroll_percent: updated_doc.current_scroll_percent,
                current_cfi: updated_doc.current_cfi,
                total_pages: updated_doc.total_pages,
                content: updated_doc.content,
                category: updated_doc.category,
                tags: updated_doc.tags,
                date_added: updated_doc.date_added.to_rfc3339(),
                date_modified: updated_doc.date_modified.to_rfc3339(),
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            error!("Failed to update progress: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
        }
    }
}

/// Tauri commands

#[tauri::command]
pub async fn start_browser_sync_server(
    port: u16,
    repo: tauri::State<'_, Repository>,
    ai_state: tauri::State<'_, crate::commands::ai::AIState>,
) -> Result<ServerStatus, AppError> {
    let config = BrowserSyncConfig {
        host: "127.0.0.1".to_string(),
        port,
        auto_start: false,
    };

    // Get AI config from the AI state
    let ai_config = {
        let guard = ai_state.config.lock().unwrap();
        guard.clone()
    };

    // Get the pool from the repository and create a new Arc<Repository>
    let pool = repo.pool().clone();
    let repo_arc = Arc::new(Repository::new(pool));
    start_server(config, repo_arc, ai_config).await?;

    Ok(ServerStatus {
        running: true,
        port,
        connections: 0,
    })
}

#[tauri::command]
pub async fn stop_browser_sync_server() -> Result<ServerStatus, AppError> {
    stop_server().await?;

    Ok(ServerStatus {
        running: false,
        port: 0,
        connections: 0,
    })
}

#[tauri::command]
pub async fn get_browser_sync_server_status(port: u16) -> Result<ServerStatus, AppError> {
    let config = BrowserSyncConfig {
        host: "127.0.0.1".to_string(),
        port,
        auto_start: false,
    };

    Ok(get_status(config).await)
}

/// Get the config file path for browser sync settings
fn get_config_path() -> std::path::PathBuf {
    let mut path = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("incrementum");
    path.push("browser_sync_config.json");
    path
}

/// Load browser sync config from file
fn load_config() -> BrowserSyncConfig {
    let path = get_config_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(config) = serde_json::from_str::<BrowserSyncConfig>(&content) {
            return config;
        }
    }
    BrowserSyncConfig::default()
}

/// Save browser sync config to file
fn save_config(config: &BrowserSyncConfig) -> Result<(), AppError> {
    let path = get_config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(AppError::Io)?;
    }
    let json = serde_json::to_string_pretty(config)
        .map_err(AppError::Serialization)?;
    std::fs::write(&path, json)
        .map_err(AppError::Io)?;
    Ok(())
}

/// Get browser sync config
#[tauri::command]
pub async fn get_browser_sync_config() -> Result<BrowserSyncConfig, AppError> {
    Ok(load_config())
}

/// Set browser sync config
#[tauri::command]
pub async fn set_browser_sync_config(config: BrowserSyncConfig) -> Result<(), AppError> {
    save_config(&config)
}

/// Initialize browser sync server (called on app startup)
pub async fn initialize_if_enabled(repo: Arc<Repository>, ai_config: Option<AIConfig>) -> Result<(), AppError> {
    let config = load_config();
    if config.auto_start {
        info!("Auto-starting browser extension server on port {}", config.port);
        let _ = start_server(config, repo, ai_config).await;
    }
    Ok(())
}
