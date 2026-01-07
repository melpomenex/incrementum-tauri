//! AI commands for Tauri
//!
//! Provides Tauri commands for AI-powered features:
//! - Flashcard generation
//! - Q&A with document context
//! - Content summarization
//! - AI configuration management

use crate::ai::{
    flashcard_generator::{BatchFlashcardGenerator, FlashcardGenerationOptions, FlashcardGenerator},
    prompts::PromptBuilder,
    qa::{ChatSession, QuestionAnswerer},
    summarizer::Summarizer,
    AIConfig, AIProvider, LLMProviderType, Message,
};
use crate::commands::Result;
use crate::database::Repository;
use crate::error::IncrementumError;
use crate::models::Extract;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// Global AI configuration state
pub struct AIState {
    config: Mutex<Option<AIConfig>>,
}

impl Default for AIState {
    fn default() -> Self {
        Self {
            config: Mutex::new(None),
        }
    }
}

/// Get AI config (clones and drops the mutex guard)
fn get_ai_config_clone(state: &State<'_, AIState>) -> Result<AIConfig> {
    let guard = state.config.lock().unwrap();
    guard
        .as_ref()
        .ok_or_else(|| IncrementumError::Internal("AI configuration not set".to_string()))
        .cloned()
}

/// Generated flashcard for Tauri
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TauriGeneratedFlashcard {
    pub question: String,
    pub answer: String,
    pub card_type: String,
    pub tags: Vec<String>,
}

impl From<crate::ai::flashcard_generator::GeneratedFlashcard> for TauriGeneratedFlashcard {
    fn from(fc: crate::ai::flashcard_generator::GeneratedFlashcard) -> Self {
        Self {
            question: fc.question,
            answer: fc.answer,
            card_type: match fc.card_type {
                crate::ai::flashcard_generator::FlashcardType::Basic => "basic".to_string(),
                crate::ai::flashcard_generator::FlashcardType::Cloze => "cloze".to_string(),
                crate::ai::flashcard_generator::FlashcardType::Qa => "qa".to_string(),
            },
            tags: fc.tags,
        }
    }
}

/// Get AI configuration
#[tauri::command]
pub async fn get_ai_config(state: State<'_, AIState>) -> Result<Option<AIConfig>> {
    let config = state.config.lock().unwrap();
    Ok(config.clone())
}

/// Set AI configuration
#[tauri::command]
pub async fn set_ai_config(config: AIConfig, state: State<'_, AIState>) -> Result<()> {
    let mut state_config = state.config.lock().unwrap();
    *state_config = Some(config);
    Ok(())
}

/// Set API key for a provider
#[tauri::command]
pub async fn set_api_key(
    provider: String,
    api_key: String,
    state: State<'_, AIState>,
) -> Result<()> {
    let mut config = state.config.lock().unwrap();
    let mut current = config.clone().unwrap_or_default();

    match provider.to_lowercase().as_str() {
        "openai" => current.api_keys.openai = Some(api_key),
        "anthropic" => current.api_keys.anthropic = Some(api_key),
        "openrouter" => current.api_keys.openrouter = Some(api_key),
        _ => return Err(IncrementumError::InvalidInput(format!("Unknown provider: {}", provider))),
    }

    *config = Some(current);
    Ok(())
}

/// Generate flashcards from an extract
#[tauri::command]
pub async fn generate_flashcards_from_extract(
    extract_id: String,
    options: FlashcardGenerationOptions,
    repo: State<'_, Repository>,
    ai_state: State<'_, AIState>,
) -> Result<Vec<TauriGeneratedFlashcard>> {
    // Get the extract
    let extract = repo
        .get_extract(&extract_id)
        .await?
        .ok_or_else(|| IncrementumError::NotFound(format!("Extract {} not found", extract_id)))?;

    // Get AI configuration (clones and drops mutex guard)
    let config = get_ai_config_clone(&ai_state)?;

    // Create provider
    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;

    // Generate flashcards
    let generator = FlashcardGenerator::new(provider);
    let flashcards = generator
        .generate_from_extract(&extract.content, None)
        .await?;

    Ok(flashcards.into_iter().map(TauriGeneratedFlashcard::from).collect())
}

/// Generate flashcards from content
#[tauri::command]
pub async fn generate_flashcards_from_content(
    content: String,
    count: usize,
    ai_state: State<'_, AIState>,
) -> Result<Vec<TauriGeneratedFlashcard>> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let generator = FlashcardGenerator::new(provider);

    let options = FlashcardGenerationOptions {
        count,
        ..Default::default()
    };

    let flashcards = generator.generate_from_content(&content, &options).await?;

    Ok(flashcards.into_iter().map(TauriGeneratedFlashcard::from).collect())
}

/// Answer a question with document context
#[tauri::command]
pub async fn answer_question(
    question: String,
    context: String,
    ai_state: State<'_, AIState>,
) -> Result<String> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let qa = QuestionAnswerer::new(provider);

    let answer = qa.answer_with_context(&question, &context).await?;
    Ok(answer)
}

/// Answer a question about an extract
#[tauri::command]
pub async fn answer_about_extract(
    extract_id: String,
    question: String,
    repo: State<'_, Repository>,
    ai_state: State<'_, AIState>,
) -> Result<String> {
    let extract = repo
        .get_extract(&extract_id)
        .await?
        .ok_or_else(|| IncrementumError::NotFound(format!("Extract {} not found", extract_id)))?;

    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let qa = QuestionAnswerer::new(provider);

    let answer = qa.answer_about_extract(&extract.content, &question).await?;
    Ok(answer)
}

/// Summarize content
#[tauri::command]
pub async fn summarize_content(
    content: String,
    max_words: usize,
    ai_state: State<'_, AIState>,
) -> Result<String> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let summarizer = Summarizer::new(provider);

    let summary = summarizer.summarize(&content, max_words).await?;
    Ok(summary)
}

/// Extract key points from content
#[tauri::command]
pub async fn extract_key_points(
    content: String,
    count: usize,
    ai_state: State<'_, AIState>,
) -> Result<Vec<String>> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let summarizer = Summarizer::new(provider);

    let points = summarizer.extract_key_points(&content, count).await?;
    Ok(points)
}

/// Generate title for content
#[tauri::command]
pub async fn generate_title(
    content: String,
    ai_state: State<'_, AIState>,
) -> Result<String> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let summarizer = Summarizer::new(provider);

    let title = summarizer.generate_title(&content).await?;
    Ok(title)
}

/// Simplify content
#[tauri::command]
pub async fn simplify_content(
    content: String,
    level: String,
    ai_state: State<'_, AIState>,
) -> Result<String> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let summarizer = Summarizer::new(provider);

    let simplification_level = match level.to_lowercase().as_str() {
        "elementary" => crate::ai::summarizer::SimplificationLevel::Elementary,
        "highschool" => crate::ai::summarizer::SimplificationLevel::HighSchool,
        "college" => crate::ai::summarizer::SimplificationLevel::College,
        "expert" => crate::ai::summarizer::SimplificationLevel::Expert,
        _ => {
            return Err(IncrementumError::InvalidInput(format!(
                "Unknown simplification level: {}",
                level
            )))
        }
    };

    let simplified = summarizer.simplify(&content, simplification_level).await?;
    Ok(simplified)
}

/// Generate questions from content
#[tauri::command]
pub async fn generate_questions(
    content: String,
    count: usize,
    ai_state: State<'_, AIState>,
) -> Result<Vec<String>> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        config.default_provider,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;
    let qa = QuestionAnswerer::new(provider);

    let questions = qa.generate_questions(&content, count).await?;
    Ok(questions)
}

/// Get available Ollama models (for local LLM)
#[tauri::command]
pub async fn list_ollama_models(
    base_url: String,
) -> Result<Vec<String>> {
    let provider = crate::ai::providers::OllamaProvider::new(base_url, "dummy".to_string());
    provider
        .list_models()
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to list Ollama models: {}", e)))
}

/// Test AI connection
#[tauri::command]
pub async fn test_ai_connection(
    provider_type: LLMProviderType,
    ai_state: State<'_, AIState>,
) -> Result<String> {
    let config = get_ai_config_clone(&ai_state)?;

    let provider = AIProvider::from_config(
        provider_type,
        &config.api_keys,
        &config.models,
        &config.local_settings,
    )
    .map_err(|e| IncrementumError::Internal(e))?;

    if !provider.is_available() {
        return Err(IncrementumError::Internal(format!(
            "Provider {:?} is not available",
            provider_type
        )));
    }

    // Test with a simple prompt
    let request = crate::ai::providers::ChatCompletionRequest {
        messages: vec![
            Message::system("You are a helpful assistant."),
            Message::user("Say 'Connection successful!'"),
        ],
        temperature: 0.5,
        max_tokens: 50,
        stream: false,
    };

    let response = provider.chat_completion(&request).await.map_err(|e| {
        IncrementumError::Internal(format!("AI connection test failed: {}", e))
    })?;

    Ok(response.content)
}
