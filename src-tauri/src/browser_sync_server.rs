//! Browser Sync Server
//!
//! HTTP server for receiving data from the browser extension.
//! The extension sends POST requests with page/extract/video data.
//! Also provides AI endpoints for summarization and content analysis.

use crate::ai::{AIConfig, AIProvider, LLMProviderType};
use crate::ai::summarizer::Summarizer;
use crate::ai::qa::QuestionAnswerer;
use crate::ai::flashcard_generator::{FlashcardGenerator, FlashcardGenerationOptions};
use crate::database::Repository;
use crate::error::AppError;
use crate::models::{Document, FileType, Extract};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json, Response},
    routing::{get, post},
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

    // Build router with AI endpoints
    let app = Router::new()
        .route("/", post(handle_extension_request))
        .route("/ai/process", post(handle_ai_request))
        .route("/ai/status", get(handle_ai_status))
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
