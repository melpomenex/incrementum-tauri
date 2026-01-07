//! Provider wrapper using enum dispatch instead of trait objects
//!
//! This approach avoids the `async_trait` Send issues by using concrete types.

use crate::ai::providers::{
    AnthropicProvider, ChatCompletionRequest, ChatCompletionResponse, LLMProvider, LLMProviderType,
    Message, MessageRole, OllamaProvider, OpenAIProvider, OpenRouterProvider,
};
use serde::{Deserialize, Serialize};

/// AI provider enum that wraps all provider types
/// This is Send-safe because it uses concrete types instead of trait objects
pub enum AIProvider {
    OpenAI(OpenAIProvider),
    Anthropic(AnthropicProvider),
    OpenRouter(OpenRouterProvider),
    Ollama(OllamaProvider),
}

// Implement Debug for AIProvider
impl std::fmt::Debug for AIProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIProvider::OpenAI(p) => f.debug_tuple("OpenAI").field(p).finish(),
            AIProvider::Anthropic(p) => f.debug_tuple("Anthropic").field(p).finish(),
            AIProvider::OpenRouter(p) => f.debug_tuple("OpenRouter").field(p).finish(),
            AIProvider::Ollama(p) => f.debug_tuple("Ollama").field(p).finish(),
        }
    }
}

impl AIProvider {
    /// Get the provider type
    pub fn provider_type(&self) -> LLMProviderType {
        match self {
            AIProvider::OpenAI(_) => LLMProviderType::OpenAI,
            AIProvider::Anthropic(_) => LLMProviderType::Anthropic,
            AIProvider::OpenRouter(_) => LLMProviderType::OpenRouter,
            AIProvider::Ollama(_) => LLMProviderType::Ollama,
        }
    }

    /// Send a chat completion request
    pub async fn chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, String> {
        match self {
            AIProvider::OpenAI(provider) => provider.chat_completion(request).await,
            AIProvider::Anthropic(provider) => provider.chat_completion(request).await,
            AIProvider::OpenRouter(provider) => provider.chat_completion(request).await,
            AIProvider::Ollama(provider) => provider.chat_completion(request).await,
        }
    }

    /// Check if the provider is available
    pub fn is_available(&self) -> bool {
        match self {
            AIProvider::OpenAI(provider) => provider.is_available(),
            AIProvider::Anthropic(provider) => provider.is_available(),
            AIProvider::OpenRouter(provider) => provider.is_available(),
            AIProvider::Ollama(provider) => provider.is_available(),
        }
    }

    /// Get model name
    pub fn model_name(&self) -> &str {
        match self {
            AIProvider::OpenAI(provider) => provider.model_name(),
            AIProvider::Anthropic(provider) => provider.model_name(),
            AIProvider::OpenRouter(provider) => provider.model_name(),
            AIProvider::Ollama(provider) => provider.model_name(),
        }
    }

    /// Create provider from type and config
    pub fn from_config(
        provider_type: LLMProviderType,
        api_keys: &APIKeys,
        models: &ModelPreferences,
        local_settings: &LocalSettings,
    ) -> Result<Self, String> {
        match provider_type {
            LLMProviderType::OpenAI => {
                let api_key = api_keys
                    .openai
                    .as_ref()
                    .ok_or("OpenAI API key not set")?
                    .clone();
                Ok(AIProvider::OpenAI(OpenAIProvider::new(
                    api_key,
                    models.openai_model.clone(),
                )))
            }
            LLMProviderType::Anthropic => {
                let api_key = api_keys
                    .anthropic
                    .as_ref()
                    .ok_or("Anthropic API key not set")?
                    .clone();
                Ok(AIProvider::Anthropic(AnthropicProvider::new(
                    api_key,
                    models.anthropic_model.clone(),
                )))
            }
            LLMProviderType::OpenRouter => {
                let api_key = api_keys
                    .openrouter
                    .as_ref()
                    .ok_or("OpenRouter API key not set")?
                    .clone();
                Ok(AIProvider::OpenRouter(OpenRouterProvider::new(
                    api_key,
                    models.openrouter_model.clone(),
                )))
            }
            LLMProviderType::Ollama => {
                Ok(AIProvider::Ollama(OllamaProvider::new(
                    local_settings.ollama_base_url.clone(),
                    models.ollama_model.clone(),
                )))
            }
        }
    }
}

/// API keys for different providers
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct APIKeys {
    pub openai: Option<String>,
    pub anthropic: Option<String>,
    pub openrouter: Option<String>,
}

/// Model preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPreferences {
    pub openai_model: String,
    pub anthropic_model: String,
    pub openrouter_model: String,
    pub ollama_model: String,
}

/// Local LLM settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSettings {
    pub ollama_base_url: String,
}

impl Default for ModelPreferences {
    fn default() -> Self {
        Self {
            openai_model: "gpt-4o-mini".to_string(),
            anthropic_model: "claude-3-5-sonnet-20241022".to_string(),
            openrouter_model: "anthropic/claude-3.5-sonnet".to_string(),
            ollama_model: "llama3.2".to_string(),
        }
    }
}

impl Default for LocalSettings {
    fn default() -> Self {
        Self {
            ollama_base_url: "http://localhost:11434".to_string(),
        }
    }
}

/// AI configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    /// Default provider to use
    pub default_provider: LLMProviderType,
    /// API keys for different providers
    pub api_keys: APIKeys,
    /// Model preferences
    pub models: ModelPreferences,
    /// Local LLM settings
    pub local_settings: LocalSettings,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            default_provider: LLMProviderType::OpenAI,
            api_keys: APIKeys::default(),
            models: ModelPreferences::default(),
            local_settings: LocalSettings::default(),
        }
    }
}
