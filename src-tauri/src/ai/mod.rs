//! AI integration module
//!
//! This module provides AI/LLM integration for Incrementum, including:
//! - Multiple LLM provider support (OpenAI, Anthropic, OpenRouter, Ollama)
//! - Flashcard generation
//! - Q&A with document context
//! - Content summarization

pub mod providers;
pub mod prompts;
pub mod flashcard_generator;
pub mod qa;
pub mod summarizer;
pub mod provider_wrapper;

// Re-exports - use the new enum-based provider
pub use provider_wrapper::{
    AIProvider, AIConfig,
};
pub use providers::{LLMProviderType, Message, MessageRole};

// Note: FlashcardGenerator, QuestionAnswerer, and Summarizer still need to be updated
// to use AIProvider instead of Box<dyn LLMProvider>
