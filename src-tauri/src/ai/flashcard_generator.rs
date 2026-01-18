//! Flashcard generation using AI
//!
//! Generates flashcards from documents, extracts, and other content using LLMs.

use crate::ai::{
    providers::ChatCompletionRequest,
    prompts::{parse_structured_response, PromptBuilder},
    AIProvider,
};
use serde::{Deserialize, Serialize};

/// Generated flashcard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedFlashcard {
    pub question: String,
    pub answer: String,
    pub card_type: FlashcardType,
    pub difficulty: Option<f64>,
    pub tags: Vec<String>,
}

/// Flashcard type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FlashcardType {
    Basic,
    Cloze,
    Qa,
}

/// Flashcard generation options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashcardGenerationOptions {
    pub count: usize,
    pub include_cloze: bool,
    pub include_qa: bool,
    pub difficulty: Option<f64>,
}

impl Default for FlashcardGenerationOptions {
    fn default() -> Self {
        Self {
            count: 5,
            include_cloze: true,
            include_qa: true,
            difficulty: None,
        }
    }
}

/// Flashcard generator
pub struct FlashcardGenerator {
    provider: AIProvider,
}

impl FlashcardGenerator {
    pub fn new(provider: AIProvider) -> Self {
        Self { provider }
    }

    /// Generate flashcards from content
    pub async fn generate_from_content(
        &self,
        content: &str,
        options: &FlashcardGenerationOptions,
    ) -> Result<Vec<GeneratedFlashcard>, String> {
        let prompt = PromptBuilder::flashcard_generation(content, options.count);

        let (messages, temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: temp,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        // Parse the response
        self.parse_flashcards(&response.content, options)
    }

    /// Generate flashcards from an extract
    pub async fn generate_from_extract(
        &self,
        extract_content: &str,
        context: Option<&str>,
    ) -> Result<Vec<GeneratedFlashcard>, String> {
        let prompt = PromptBuilder::flashcard_from_extract(extract_content, context);

        let (messages, temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: temp,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        self.parse_flashcards(&response.content, &FlashcardGenerationOptions::default())
    }

    /// Generate flashcards from document
    pub async fn generate_from_document(
        &self,
        title: &str,
        content: &str,
        options: &FlashcardGenerationOptions,
    ) -> Result<Vec<GeneratedFlashcard>, String> {
        let full_content = format!("Document: {}\n\n{}", title, content);
        self.generate_from_content(&full_content, options).await
    }

    /// Parse flashcards from AI response
    fn parse_flashcards(
        &self,
        response: &str,
        options: &FlashcardGenerationOptions,
    ) -> Result<Vec<GeneratedFlashcard>, String> {
        let items = parse_structured_response(response)?;

        let flashcards: Vec<GeneratedFlashcard> = items
            .into_iter()
            .map(|item| {
                let card_type = match item.item_type.as_deref() {
                    Some("cloze") => FlashcardType::Cloze,
                    Some("qa") => FlashcardType::Qa,
                    _ => FlashcardType::Basic,
                };

                GeneratedFlashcard {
                    question: item.question,
                    answer: item.answer,
                    card_type,
                    difficulty: options.difficulty,
                    tags: Vec::new(),
                }
            })
            .collect();

        Ok(flashcards)
    }
}

/// Batch flashcard generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchFlashcardResult {
    pub flashcards: Vec<GeneratedFlashcard>,
    pub total_generated: usize,
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// Batch flashcard generator for multiple extracts
pub struct BatchFlashcardGenerator {
    generator: FlashcardGenerator,
}

impl BatchFlashcardGenerator {
    pub fn new(provider: AIProvider) -> Self {
        Self {
            generator: FlashcardGenerator::new(provider),
        }
    }

    /// Generate flashcards from multiple extracts
    pub async fn generate_from_extracts(
        &self,
        extracts: Vec<(String, String)>, // (id, content)
    ) -> Result<Vec<(String, Vec<GeneratedFlashcard>)>, String> {
        let mut results = Vec::new();

        for (id, content) in extracts {
            match self
                .generator
                .generate_from_extract(&content, None)
                .await
            {
                Ok(flashcards) => {
                    if !flashcards.is_empty() {
                        results.push((id, flashcards));
                    }
                }
                Err(e) => {
                    eprintln!("Failed to generate flashcards for extract {}: {}", id, e);
                }
            }
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::providers::{ChatCompletionRequest, ChatCompletionResponse, LLMProvider, Message, MessageRole};

    // Mock provider for testing
    #[derive(Debug)]
    struct MockProvider {
        response: String,
    }

    #[async_trait::async_trait]
    impl LLMProvider for MockProvider {
        fn provider_type(&self) -> crate::ai::LLMProviderType {
            crate::ai::LLMProviderType::OpenAI
        }

        async fn chat_completion(
            &self,
            _request: &ChatCompletionRequest,
        ) -> Result<ChatCompletionResponse, String> {
            Ok(ChatCompletionResponse {
                content: self.response.clone(),
                input_tokens: 100,
                output_tokens: 200,
                finish_reason: "stop".to_string(),
            })
        }

        fn is_available(&self) -> bool {
            true
        }
    }

    #[tokio::test]
    async fn test_generate_from_extract() {
        let mock_response = r#"[{"question": "What is AI?", "answer": "Artificial Intelligence", "type": "basic"}]"#;
        let provider = Box::new(MockProvider {
            response: mock_response.to_string(),
        });
        let generator = FlashcardGenerator::new(provider);

        let result = generator
            .generate_from_extract("AI is a field of computer science.", None)
            .await
            .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].question, "What is AI?");
        assert_eq!(result[0].answer, "Artificial Intelligence");
    }
}
