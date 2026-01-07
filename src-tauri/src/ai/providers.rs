//! LLM provider implementations
//!
//! Supports multiple LLM providers:
//! - OpenAI (GPT-4, GPT-3.5)
//! - Anthropic (Claude)
//! - OpenRouter (multi-provider)
//! - Ollama (local models)

use crate::ai::{AIConfig, APIKeys, LocalSettings, ModelPreferences};
use serde::{Deserialize, Serialize};
use serde_json::json;

/// LLM provider type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum LLMProviderType {
    OpenAI,
    Anthropic,
    OpenRouter,
    Ollama,
}

/// Message role
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

/// Chat message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: MessageRole,
    pub content: String,
}

impl Message {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::System,
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::User,
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::Assistant,
            content: content.into(),
        }
    }
}

/// Chat completion request
#[derive(Debug, Clone)]
pub struct ChatCompletionRequest {
    pub messages: Vec<Message>,
    pub temperature: f32,
    pub max_tokens: u32,
    pub stream: bool,
}

impl Default for ChatCompletionRequest {
    fn default() -> Self {
        Self {
            messages: Vec::new(),
            temperature: 0.7,
            max_tokens: 4096,
            stream: false,
        }
    }
}

/// Chat completion response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    pub content: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub finish_reason: String,
}

/// Trait for LLM providers
#[async_trait::async_trait]
pub trait LLMProvider: Send + Sync + std::fmt::Debug {
    /// Get provider type
    fn provider_type(&self) -> LLMProviderType;

    /// Send chat completion request
    async fn chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, String>;

    /// Check if provider is available
    fn is_available(&self) -> bool;
}

/// OpenAI provider
pub struct OpenAIProvider {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl OpenAIProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: reqwest::Client::new(),
        }
    }

    pub fn model_name(&self) -> &str {
        &self.model
    }
}

impl std::fmt::Debug for OpenAIProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenAIProvider")
            .field("model", &self.model)
            .finish()
    }
}

#[async_trait::async_trait]
impl LLMProvider for OpenAIProvider {
    fn provider_type(&self) -> LLMProviderType {
        LLMProviderType::OpenAI
    }

    async fn chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, String> {
        let url = "https://api.openai.com/v1/chat/completions";

        let body = json!({
            "model": self.model,
            "messages": request.messages.iter().map(|m| json!({
                "role": match m.role {
                    MessageRole::System => "system",
                    MessageRole::User => "user",
                    MessageRole::Assistant => "assistant",
                },
                "content": m.content,
            })).collect::<Vec<_>>(),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        });

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("OpenAI API error {}: {}", status, error_text));
        }

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let input_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;
        let finish_reason = json["choices"][0]["finish_reason"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        Ok(ChatCompletionResponse {
            content,
            input_tokens,
            output_tokens,
            finish_reason,
        })
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
}

/// Anthropic provider
pub struct AnthropicProvider {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl AnthropicProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: reqwest::Client::new(),
        }
    }

    pub fn model_name(&self) -> &str {
        &self.model
    }
}

impl std::fmt::Debug for AnthropicProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AnthropicProvider")
            .field("model", &self.model)
            .finish()
    }
}

#[async_trait::async_trait]
impl LLMProvider for AnthropicProvider {
    fn provider_type(&self) -> LLMProviderType {
        LLMProviderType::Anthropic
    }

    async fn chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, String> {
        let url = "https://api.anthropic.com/v1/messages";

        // Extract system message if present
        let system_message = request
            .messages
            .iter()
            .find(|m| m.role == MessageRole::System)
            .map(|m| m.content.clone());

        // Filter out system message from the messages array
        let messages: Vec<_> = request
            .messages
            .iter()
            .filter(|m| m.role != MessageRole::System)
            .map(|m| json!({
                "role": match m.role {
                    MessageRole::User => "user",
                    MessageRole::Assistant => "assistant",
                    MessageRole::System => "user", // Should not happen due to filter
                },
                "content": m.content,
            }))
            .collect();

        let mut body = json!({
            "model": self.model,
            "messages": messages,
            "max_tokens": request.max_tokens,
        });

        if let Some(system) = system_message {
            body["system"] = json!(system);
        }

        let response = self
            .client
            .post(url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Anthropic API error {}: {}", status, error_text));
        }

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let content = json["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let input_tokens = json["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;
        let finish_reason = json["stop_reason"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        Ok(ChatCompletionResponse {
            content,
            input_tokens,
            output_tokens,
            finish_reason,
        })
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
}

/// OpenRouter provider
pub struct OpenRouterProvider {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl OpenRouterProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: reqwest::Client::new(),
        }
    }

    pub fn model_name(&self) -> &str {
        &self.model
    }
}

impl std::fmt::Debug for OpenRouterProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenRouterProvider")
            .field("model", &self.model)
            .finish()
    }
}

#[async_trait::async_trait]
impl LLMProvider for OpenRouterProvider {
    fn provider_type(&self) -> LLMProviderType {
        LLMProviderType::OpenRouter
    }

    async fn chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, String> {
        let url = "https://openrouter.ai/api/v1/chat/completions";

        let body = json!({
            "model": self.model,
            "messages": request.messages.iter().map(|m| json!({
                "role": match m.role {
                    MessageRole::System => "system",
                    MessageRole::User => "user",
                    MessageRole::Assistant => "assistant",
                },
                "content": m.content,
            })).collect::<Vec<_>>(),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        });

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("HTTP-Referer", "https://incrementum.app")
            .header("X-Title", "Incrementum")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("OpenRouter API error {}: {}", status, error_text));
        }

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let input_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;
        let finish_reason = json["choices"][0]["finish_reason"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        Ok(ChatCompletionResponse {
            content,
            input_tokens,
            output_tokens,
            finish_reason,
        })
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
}

/// Ollama provider (local LLM)
pub struct OllamaProvider {
    base_url: String,
    model: String,
    client: reqwest::Client,
}

impl OllamaProvider {
    pub fn new(base_url: String, model: String) -> Self {
        Self {
            base_url,
            model,
            client: reqwest::Client::new(),
        }
    }

    pub fn model_name(&self) -> &str {
        &self.model
    }

    /// List available models
    pub async fn list_models(&self) -> Result<Vec<String>, String> {
        let url = format!("{}/api/tags", self.base_url);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err("Failed to list Ollama models".to_string());
        }

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let models = json["models"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|m| m["name"].as_str())
            .map(|s| s.to_string())
            .collect();

        Ok(models)
    }
}

impl std::fmt::Debug for OllamaProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OllamaProvider")
            .field("base_url", &self.base_url)
            .field("model", &self.model)
            .finish()
    }
}

#[async_trait::async_trait]
impl LLMProvider for OllamaProvider {
    fn provider_type(&self) -> LLMProviderType {
        LLMProviderType::Ollama
    }

    async fn chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, String> {
        let url = format!("{}/api/chat", self.base_url);

        // Ollama uses a slightly different format
        let messages: Vec<_> = request
            .messages
            .iter()
            .map(|m| json!({
                "role": match m.role {
                    MessageRole::System => "system",
                    MessageRole::User => "user",
                    MessageRole::Assistant => "assistant",
                },
                "content": m.content,
            }))
            .collect();

        let body = json!({
            "model": self.model,
            "messages": messages,
            "stream": false,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            }
        });

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Ollama error {}: {}", status, error_text));
        }

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let content = json["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // Ollama doesn't provide token counts in the same way
        let input_tokens = 0;
        let output_tokens = 0;
        let finish_reason = json["done"]
            .as_bool()
            .map(|d| if d { "stop" } else { "unknown" })
            .unwrap_or("unknown")
            .to_string();

        Ok(ChatCompletionResponse {
            content,
            input_tokens,
            output_tokens,
            finish_reason,
        })
    }

    fn is_available(&self) -> bool {
        // Try to check if Ollama is running
        // This is a basic check - in production you might want a health check
        true
    }
}
