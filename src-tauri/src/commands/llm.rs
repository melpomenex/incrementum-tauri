//! LLM Commands for Tauri with Streaming Support
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;

const DEFAULT_MAX_TOKENS: usize = 2000;

// Event names for streaming
const LLM_STREAM_CHUNK: &str = "llm:stream:chunk";
const LLM_STREAM_DONE: &str = "llm:stream:done";
const LLM_STREAM_ERROR: &str = "llm:stream:error";

// OpenAI API Types
#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f64,
    max_tokens: usize,
    stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    usage: Option<OpenAIUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessageContent,
}

#[derive(Debug, Deserialize)]
struct OpenAIMessageContent {
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: usize,
    completion_tokens: usize,
    total_tokens: usize,
}

// OpenAI Streaming Types
#[derive(Debug, Deserialize)]
struct OpenAIStreamChunk {
    id: Option<String>,
    choices: Vec<OpenAIStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamChoice {
    delta: OpenAIStreamDelta,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamDelta {
    content: Option<String>,
}

// Anthropic API Types
#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<AnthropicMessage>,
    max_tokens: usize,
    temperature: f64,
    anthropic_version: String,
    stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
    usage: Option<AnthropicUsage>,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    text: String,
    #[serde(rename = "type")]
    content_type: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    input_tokens: usize,
    output_tokens: usize,
}

// Anthropic Streaming Types
#[derive(Debug, Deserialize)]
struct AnthropicStreamChunk {
    #[serde(rename = "type")]
    chunk_type: String,
    index: Option<usize>,
    delta: Option<AnthropicStreamDelta>,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AnthropicStreamDelta {
    #[serde(rename = "type")]
    delta_type: String,
    text: Option<String>,
}

// Ollama API Types (OpenAI-compatible)
#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    temperature: f64,
    num_predict: usize,
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    message: OpenAIMessageContent,
    prompt_eval_count: Option<usize>,
    eval_count: Option<usize>,
}

// Ollama Streaming Types
#[derive(Debug, Deserialize)]
struct OllamaStreamChunk {
    done: bool,
    message: Option<OllamaStreamMessage>,
    prompt_eval_count: Option<usize>,
    eval_count: Option<usize>,
}

#[derive(Debug, Deserialize)]
struct OllamaStreamMessage {
    role: String,
    content: String,
}

// Non-streaming commands
#[tauri::command]
pub async fn llm_chat(
    provider: String,
    model: Option<String>,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<LLMResponse, String> {
    let client = Client::new();
    let model = model.unwrap_or_else(|| get_default_model(&provider));
    let max_tokens = if max_tokens == 0 { DEFAULT_MAX_TOKENS } else { max_tokens };
    let base_url = base_url.unwrap_or_else(|| get_default_base_url(&provider));

    if api_key.is_none() && provider != "ollama" {
        return Err("API key is required".to_string());
    }

    let result = match provider.as_str() {
        "openai" => {
            call_openai_with_key(&client, &model, messages, temperature, max_tokens, &api_key.unwrap(), &base_url).await?
        }
        "anthropic" => {
            call_anthropic_with_key(&client, &model, messages, temperature, max_tokens, &api_key.unwrap(), &base_url).await?
        }
        "ollama" => {
            call_ollama_with_url(&client, &model, messages, temperature, max_tokens, &base_url).await?
        }
        "openrouter" => {
            call_openrouter_with_key(&client, &model, messages, temperature, max_tokens, &api_key.unwrap(), &base_url).await?
        }
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    Ok(result)
}

#[tauri::command]
pub async fn llm_chat_with_context(
    provider: String,
    messages: Vec<LLMMessage>,
    context: LLMContextRequest,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<LLMResponse, String> {
    // Build context prompt
    let context_prompt = build_context_prompt(&context);

    // Prepend context as a system message
    let mut messages_with_context = vec![
        LLMMessage {
            role: "system".to_string(),
            content: context_prompt,
        }
    ];
    messages_with_context.extend(messages);

    // Call with default parameters
    llm_chat(provider, None, messages_with_context, 0.7, DEFAULT_MAX_TOKENS, api_key, base_url).await
}

// Streaming command - emits events to frontend
#[tauri::command]
pub async fn llm_stream_chat(
    app: AppHandle,
    provider: String,
    model: Option<String>,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<(), String> {
    let client = Client::new();
    let model = model.unwrap_or_else(|| get_default_model(&provider));
    let max_tokens = if max_tokens == 0 { DEFAULT_MAX_TOKENS } else { max_tokens };
    let base_url = base_url.unwrap_or_else(|| get_default_base_url(&provider));

    if api_key.is_none() && provider != "ollama" {
        let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
            "error": "API key is required"
        }));
        return Err("API key is required".to_string());
    }

    let result = match provider.as_str() {
        "openai" => {
            stream_openai(&app, &client, &model, messages, temperature, max_tokens, &api_key.unwrap(), &base_url).await?
        }
        "anthropic" => {
            stream_anthropic(&app, &client, &model, messages, temperature, max_tokens, &api_key.unwrap(), &base_url).await?
        }
        "ollama" => {
            stream_ollama(&app, &client, &model, messages, temperature, max_tokens, &base_url).await?
        }
        "openrouter" => {
            stream_openai(&app, &client, &model, messages, temperature, max_tokens, &api_key.unwrap(), &base_url).await?
        }
        _ => {
            let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                "error": format!("Unknown provider: {}", provider)
            }));
            return Err(format!("Unknown provider: {}", provider));
        }
    };

    Ok(result)
}

// Streaming implementations
async fn stream_openai(
    app: &AppHandle,
    client: &Client,
    model: &str,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    api_key: &str,
    base_url: &str,
) -> Result<(), String> {
    let request = OpenAIRequest {
        model: model.to_string(),
        messages: messages
            .into_iter()
            .map(|m| OpenAIMessage {
                role: m.role,
                content: m.content,
            })
            .collect(),
        temperature,
        max_tokens,
        stream: Some(true),
    };

    let response = client
        .post(&format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                "error": format!("OpenAI API request failed: {}", e)
            }));
            format!("OpenAI API request failed: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
            "error": format!("OpenAI API error ({}): {}", status, error_text)
        }));
        return Err(format!("OpenAI API error ({}): {}", status, error_text));
    }

    // Process streaming response
    let mut stream = response.bytes_stream();
    let mut buffer = Vec::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| {
            let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                "error": format!("Stream error: {}", e)
            }));
            format!("Stream error: {}", e)
        })?;

        buffer.extend_from_slice(&chunk);
        let data = String::from_utf8_lossy(&buffer);

        // Process SSE lines
        for line in data.lines() {
            let line = line.trim();
            if line.is_empty() || line == "data: [DONE]" {
                continue;
            }

            if line.starts_with("data: ") {
                let json_str = &line[6..];
                if let Ok(chunk_data) = serde_json::from_str::<OpenAIStreamChunk>(json_str) {
                    if let Some(choice) = chunk_data.choices.first() {
                        if let Some(content) = &choice.delta.content {
                            let _ = app.emit(LLM_STREAM_CHUNK, serde_json::json!({
                                "content": content,
                                "done": choice.finish_reason.is_some()
                            }));

                            if choice.finish_reason.is_some() {
                                let _ = app.emit(LLM_STREAM_DONE, serde_json::json!({}));
                                return Ok(());
                            }
                        }
                    }
                }
            }
        }

        buffer.clear();
    }

    let _ = app.emit(LLM_STREAM_DONE, serde_json::json!({}));
    Ok(())
}

async fn stream_anthropic(
    app: &AppHandle,
    client: &Client,
    model: &str,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    api_key: &str,
    base_url: &str,
) -> Result<(), String> {
    // Filter out system messages for Anthropic
    let (system_message, chat_messages): (Vec<_>, Vec<_>) = messages
        .into_iter()
        .partition(|m| m.role == "system");

    let system_content = system_message
        .first()
        .map(|m| m.content.clone())
        .unwrap_or_default();

    let anthropic_messages: Vec<AnthropicMessage> = chat_messages
        .into_iter()
        .map(|m| AnthropicMessage {
            role: m.role,
            content: m.content,
        })
        .collect();

    let request = AnthropicRequest {
        model: model.to_string(),
        messages: anthropic_messages,
        max_tokens,
        temperature,
        anthropic_version: "2023-06-01".to_string(),
        stream: Some(true),
    };

    let response = client
        .post(&format!("{}/messages", base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                "error": format!("Anthropic API request failed: {}", e)
            }));
            format!("Anthropic API request failed: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
            "error": format!("Anthropic API error ({}): {}", status, error_text)
        }));
        return Err(format!("Anthropic API error ({}): {}", status, error_text));
    }

    // Process streaming response
    let mut stream = response.bytes_stream();
    let mut buffer = Vec::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| {
            let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                "error": format!("Stream error: {}", e)
            }));
            format!("Stream error: {}", e)
        })?;

        buffer.extend_from_slice(&chunk);
        let data = String::from_utf8_lossy(&buffer);

        // Process SSE lines
        for line in data.lines() {
            let line = line.trim();
            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }

            let json_str = &line[6..];
            if let Ok(chunk_data) = serde_json::from_str::<AnthropicStreamChunk>(json_str) {
                match chunk_data.chunk_type.as_str() {
                    "content_block_delta" => {
                        if let Some(delta) = chunk_data.delta {
                            if let Some(text) = delta.text {
                                let _ = app.emit(LLM_STREAM_CHUNK, serde_json::json!({
                                    "content": text,
                                    "done": false
                                }));
                            }
                        }
                    }
                    "message_stop" => {
                        let _ = app.emit(LLM_STREAM_DONE, serde_json::json!({}));
                        return Ok(());
                    }
                    "error" => {
                        let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                            "error": "Anthropic streaming error"
                        }));
                        return Err("Anthropic streaming error".to_string());
                    }
                    _ => {}
                }
            }
        }

        buffer.clear();
    }

    let _ = app.emit(LLM_STREAM_DONE, serde_json::json!({}));
    Ok(())
}

async fn stream_ollama(
    app: &AppHandle,
    client: &Client,
    model: &str,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    base_url: &str,
) -> Result<(), String> {
    let request = OllamaRequest {
        model: model.to_string(),
        messages: messages
            .into_iter()
            .map(|m| OpenAIMessage {
                role: m.role,
                content: m.content,
            })
            .collect(),
        stream: true,
        options: OllamaOptions {
            temperature,
            num_predict: max_tokens,
        },
    };

    let response = client
        .post(&format!("{}/chat/completions", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                "error": format!("Ollama API request failed: {}", e)
            }));
            format!("Ollama API request failed: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
            "error": format!("Ollama API error ({}): {}", status, error_text)
        }));
        return Err(format!("Ollama API error ({}): {}", status, error_text));
    }

    // Process streaming response
    let mut stream = response.bytes_stream();
    let mut buffer = Vec::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| {
            let _ = app.emit(LLM_STREAM_ERROR, serde_json::json!({
                "error": format!("Stream error: {}", e)
            }));
            format!("Stream error: {}", e)
        })?;

        buffer.extend_from_slice(&chunk);
        let data = String::from_utf8_lossy(&buffer);

        // Ollama sends JSON objects separated by newlines
        for line in data.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if let Ok(chunk_data) = serde_json::from_str::<OllamaStreamChunk>(line) {
                if let Some(message) = chunk_data.message {
                    if !message.content.is_empty() {
                        let _ = app.emit(LLM_STREAM_CHUNK, serde_json::json!({
                            "content": message.content,
                            "done": false
                        }));
                    }
                }

                if chunk_data.done {
                    let _ = app.emit(LLM_STREAM_DONE, serde_json::json!({}));
                    return Ok(());
                }
            }
        }

        buffer.clear();
    }

    let _ = app.emit(LLM_STREAM_DONE, serde_json::json!({}));
    Ok(())
}

#[tauri::command]
pub async fn llm_get_models(provider: String, api_key: Option<String>, base_url: Option<String>) -> Result<Vec<String>, String> {
    match provider.as_str() {
        "openai" => Ok(vec![
            "gpt-4o".to_string(),
            "gpt-4o-mini".to_string(),
            "gpt-4-turbo".to_string(),
            "gpt-3.5-turbo".to_string(),
        ]),
        "anthropic" => Ok(vec![
            "claude-3-5-sonnet-20241022".to_string(),
            "claude-3-5-haiku-20241022".to_string(),
            "claude-3-opus-20240229".to_string(),
        ]),
        "ollama" => Ok(vec![
            "llama3.2".to_string(),
            "mistral".to_string(),
            "codellama".to_string(),
            "phi3".to_string(),
        ]),
        "openrouter" => {
            // Fetch from OpenRouter API if API key is provided
            if let Some(key) = api_key {
                if !key.is_empty() {
                    let client = Client::new();
                    let url = base_url.unwrap_or_else(|| "https://openrouter.ai/api/v1".to_string());
                    return fetch_openrouter_models(&client, &url, &key).await;
                }
            }
            // Fallback to default list
            Ok(vec![
                "anthropic/claude-3.5-sonnet".to_string(),
                "anthropic/claude-3.5-sonnet:beta".to_string(),
                "anthropic/claude-3.5-haiku".to_string(),
                "anthropic/claude-3-opus".to_string(),
                "openai/gpt-4o".to_string(),
                "openai/gpt-4o-mini".to_string(),
                "openai/gpt-4-turbo".to_string(),
                "google/gemini-pro-1.5".to_string(),
                "meta-llama/llama-3.1-405b-instruct".to_string(),
                "deepseek/deepseek-chat".to_string(),
            ])
        }
        _ => Err(format!("Unknown provider: {}", provider)),
    }
}

#[tauri::command]
pub async fn llm_test_connection(
    provider: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<bool, String> {
    let client = Client::new();
    let base_url = base_url.unwrap_or_else(|| get_default_base_url(&provider));

    if api_key.is_empty() && provider != "ollama" {
        return Err("API key is required".to_string());
    }

    let result = match provider.as_str() {
        "openai" => {
            test_openai_connection(&client, &base_url, &api_key).await?
        }
        "anthropic" => {
            test_anthropic_connection(&client, &base_url, &api_key).await?
        }
        "ollama" => {
            test_ollama_connection(&client, &base_url).await?
        }
        "openrouter" => {
            test_openrouter_connection(&client, &base_url, &api_key).await?
        }
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    Ok(result)
}

// Non-streaming helper functions (kept for compatibility)
async fn call_openai_with_key(
    client: &Client,
    model: &str,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    api_key: &str,
    base_url: &str,
) -> Result<LLMResponse, String> {
    let request = OpenAIRequest {
        model: model.to_string(),
        messages: messages
            .into_iter()
            .map(|m| OpenAIMessage {
                role: m.role,
                content: m.content,
            })
            .collect(),
        temperature,
        max_tokens,
        stream: None,
    };

    let response = client
        .post(&format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("OpenAI API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error ({}): {}", status, error_text));
    }

    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    let content = openai_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_default();

    Ok(LLMResponse {
        content,
        usage: openai_response.usage.map(|u| LLMUsage {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        }),
    })
}

async fn call_anthropic_with_key(
    client: &Client,
    model: &str,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    api_key: &str,
    base_url: &str,
) -> Result<LLMResponse, String> {
    // Filter out system messages for Anthropic
    let (system_message, chat_messages): (Vec<_>, Vec<_>) = messages
        .into_iter()
        .partition(|m| m.role == "system");

    let system_content = system_message
        .first()
        .map(|m| m.content.clone())
        .unwrap_or_default();

    let anthropic_messages: Vec<AnthropicMessage> = chat_messages
        .into_iter()
        .map(|m| AnthropicMessage {
            role: m.role,
            content: m.content,
        })
        .collect();

    let request = AnthropicRequest {
        model: model.to_string(),
        messages: anthropic_messages,
        max_tokens,
        temperature,
        anthropic_version: "2023-06-01".to_string(),
        stream: None,
    };

    let response = client
        .post(&format!("{}/messages", base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Anthropic API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API error ({}): {}", status, error_text));
    }

    let anthropic_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Anthropic response: {}", e))?;

    let content = anthropic_response
        .content
        .iter()
        .filter(|c| c.content_type == "text")
        .map(|c| c.text.clone())
        .collect::<Vec<_>>()
        .join("\n");

    Ok(LLMResponse {
        content,
        usage: anthropic_response.usage.map(|u| LLMUsage {
            prompt_tokens: u.input_tokens,
            completion_tokens: u.output_tokens,
            total_tokens: u.input_tokens + u.output_tokens,
        }),
    })
}

async fn call_ollama_with_url(
    client: &Client,
    model: &str,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    base_url: &str,
) -> Result<LLMResponse, String> {
    let request = OllamaRequest {
        model: model.to_string(),
        messages: messages
            .into_iter()
            .map(|m| OpenAIMessage {
                role: m.role,
                content: m.content,
            })
            .collect(),
        stream: false,
        options: OllamaOptions {
            temperature,
            num_predict: max_tokens,
        },
    };

    let response = client
        .post(&format!("{}/chat/completions", base_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Ollama API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Ollama API error ({}): {}", status, error_text));
    }

    let ollama_response: OllamaResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    Ok(LLMResponse {
        content: ollama_response.message.content,
        usage: ollama_response.prompt_eval_count.map(|p| LLMUsage {
            prompt_tokens: p,
            completion_tokens: ollama_response.eval_count.unwrap_or(0),
            total_tokens: p + ollama_response.eval_count.unwrap_or(0),
        }),
    })
}

async fn call_openrouter_with_key(
    client: &Client,
    model: &str,
    messages: Vec<LLMMessage>,
    temperature: f64,
    max_tokens: usize,
    api_key: &str,
    base_url: &str,
) -> Result<LLMResponse, String> {
    let request = OpenAIRequest {
        model: model.to_string(),
        messages: messages
            .into_iter()
            .map(|m| OpenAIMessage {
                role: m.role,
                content: m.content,
            })
            .collect(),
        temperature,
        max_tokens,
        stream: None,
    };

    let response = client
        .post(&format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://incrementum.app")
        .header("X-Title", "Incrementum")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("OpenRouter API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenRouter API error ({}): {}", status, error_text));
    }

    let openrouter_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenRouter response: {}", e))?;

    let content = openrouter_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_default();

    Ok(LLMResponse {
        content,
        usage: openrouter_response.usage.map(|u| LLMUsage {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        }),
    })
}

async fn test_openai_connection(
    client: &Client,
    base_url: &str,
    api_key: &str,
) -> Result<bool, String> {
    let request = OpenAIRequest {
        model: "gpt-3.5-turbo".to_string(),
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: "Test".to_string(),
        }],
        temperature: 0.5,
        max_tokens: 5,
        stream: None,
    };

    let response = client
        .post(&format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    Ok(response.status().is_success())
}

async fn test_anthropic_connection(
    client: &Client,
    base_url: &str,
    api_key: &str,
) -> Result<bool, String> {
    let request = AnthropicRequest {
        model: "claude-3-haiku-20240307".to_string(),
        messages: vec![AnthropicMessage {
            role: "user".to_string(),
            content: "Test".to_string(),
        }],
        max_tokens: 5,
        temperature: 0.5,
        anthropic_version: "2023-06-01".to_string(),
        stream: None,
    };

    let response = client
        .post(&format!("{}/messages", base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    Ok(response.status().is_success())
}

async fn test_ollama_connection(
    client: &Client,
    base_url: &str,
) -> Result<bool, String> {
    let response = client
        .get(&format!("{}/tags", base_url.replace("/v1", "")))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    Ok(response.status().is_success())
}

async fn test_openrouter_connection(
    client: &Client,
    base_url: &str,
    api_key: &str,
) -> Result<bool, String> {
    let request = OpenAIRequest {
        model: "meta-llama/llama-3.1-8b-instruct:free".to_string(),
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: "Test".to_string(),
        }],
        temperature: 0.5,
        max_tokens: 5,
        stream: None,
    };

    let response = client
        .post(&format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://incrementum.app")
        .header("X-Title", "Incrementum")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    Ok(response.status().is_success())
}

async fn fetch_openrouter_models(
    client: &Client,
    base_url: &str,
    api_key: &str,
) -> Result<Vec<String>, String> {
    #[derive(Debug, Deserialize)]
    struct OpenRouterModel {
        id: String,
        name: String,
        context_length: Option<usize>,
        pricing: Option<serde_json::Value>,
    }

    let response = client
        .get(&format!("{}/models", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://incrementum.app")
        .header("X-Title", "Incrementum")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models from OpenRouter: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenRouter models API error ({}): {}", status, error_text));
    }

    #[derive(Debug, Deserialize)]
    struct OpenRouterModelsResponse {
        data: Vec<OpenRouterModel>,
    }

    let models_response: OpenRouterModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenRouter models response: {}", e))?;

    // Extract model IDs and sort them
    let mut models: Vec<String> = models_response
        .data
        .into_iter()
        .map(|m| m.id)
        .collect();

    models.sort();

    Ok(models)
}

// Helper functions
fn get_default_model(provider: &str) -> String {
    match provider {
        "openai" => "gpt-4o".to_string(),
        "anthropic" => "claude-3-5-sonnet-20241022".to_string(),
        "ollama" => "llama3.2".to_string(),
        "openrouter" => "anthropic/claude-3.5-sonnet".to_string(),
        _ => "default".to_string(),
    }
}

fn get_default_base_url(provider: &str) -> String {
    match provider {
        "openai" => "https://api.openai.com/v1".to_string(),
        "anthropic" => "https://api.anthropic.com/v1".to_string(),
        "ollama" => "http://localhost:11434/v1".to_string(),
        "openrouter" => "https://openrouter.ai/api/v1".to_string(),
        _ => "".to_string(),
    }
}

fn build_context_prompt(context: &LLMContextRequest) -> String {
    match context.r#type.as_str() {
        "document" => {
            format!(
                "The user is viewing a document{}{}{}Please provide assistance based on this context.",
                context.document_id.as_ref().map(|id| format!(" (ID: {})", id)).unwrap_or_default(),
                context.selection.as_ref().map(|s| format!("\nSelected text: \"{}\"", s)).unwrap_or_default(),
                context.content.as_ref().map(|c| format!("\nContent: {}", c)).unwrap_or_default()
            )
        }
        "web" => {
            format!(
                "The user is browsing the web page: {}{}Please provide assistance based on this context.",
                context.url.as_ref().map(|u| u.as_str()).unwrap_or("Unknown"),
                context.selection.as_ref().map(|s| format!("\nSelected text: \"{}\"", s)).unwrap_or_default()
            )
        }
        _ => "You are a helpful assistant.".to_string(),
    }
}

// Types for Tauri commands

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LLMMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LLMResponse {
    pub content: String,
    pub usage: Option<LLMUsage>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LLMUsage {
    pub prompt_tokens: usize,
    pub completion_tokens: usize,
    pub total_tokens: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LLMContextRequest {
    #[serde(rename = "type")]
    pub r#type: String,
    pub document_id: Option<String>,
    pub url: Option<String>,
    pub selection: Option<String>,
    pub content: Option<String>,
}
