//! Prompt building system
//!
//! Provides structured prompt building for various AI tasks.

use crate::ai::Message;
use serde::{Deserialize, Serialize};

/// Prompt builder for constructing AI prompts
pub struct PromptBuilder {
    messages: Vec<Message>,
    system_prompt: Option<String>,
    temperature: f32,
    max_tokens: u32,
}

impl Default for PromptBuilder {
    fn default() -> Self {
        Self {
            messages: Vec::new(),
            system_prompt: None,
            temperature: 0.7,
            max_tokens: 4096,
        }
    }
}

impl PromptBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the system prompt
    pub fn with_system(mut self, prompt: impl Into<String>) -> Self {
        self.system_prompt = Some(prompt.into());
        self
    }

    /// Set temperature
    pub fn with_temperature(mut self, temp: f32) -> Self {
        self.temperature = temp.max(0.0).min(2.0);
        self
    }

    /// Set max tokens
    pub fn with_max_tokens(mut self, tokens: u32) -> Self {
        self.max_tokens = tokens;
        self
    }

    /// Add a user message
    pub fn add_user(mut self, content: impl Into<String>) -> Self {
        self.messages.push(Message::user(content));
        self
    }

    /// Add an assistant message
    pub fn add_assistant(mut self, content: impl Into<String>) -> Self {
        self.messages.push(Message::assistant(content));
        self
    }

    /// Add context about a document
    pub fn add_document_context(mut self, title: &str, content: &str) -> Self {
        let context = format!(
            "Document: {}\n\nContent:\n{}",
            title,
            content
        );
        self.messages.push(Message::user(context));
        self
    }

    /// Build the final message list
    pub fn build(self) -> (Vec<Message>, f32, u32) {
        let mut messages = self.messages;

        // Prepend system message if present
        if let Some(system) = self.system_prompt {
            messages.insert(0, Message::system(system));
        }

        (messages, self.temperature, self.max_tokens)
    }

    /// Build messages only
    pub fn build_messages(self) -> Vec<Message> {
        let mut messages = self.messages;
        if let Some(system) = self.system_prompt {
            messages.insert(0, Message::system(system));
        }
        messages
    }
}

/// Flashcard generation prompt
impl PromptBuilder {
    /// Create a prompt for generating flashcards from content
    pub fn flashcard_generation(content: &str, count: usize) -> Self {
        Self::new()
            .with_system(
                "You are an expert at creating educational flashcards. \
                Generate clear, concise flashcards that test understanding of key concepts. \
                Return the flashcards in JSON format with 'question' and 'answer' fields.",
            )
            .add_user(format!(
                "Generate {} flashcards from the following content:\n\n{}",
                count, content
            ))
    }

    /// Create a prompt for generating flashcards from an extract
    pub fn flashcard_from_extract(extract_content: &str, context: Option<&str>) -> Self {
        let builder = Self::new()
            .with_system(
                "You are an expert at creating educational flashcards. \
                Generate 1-3 high-quality flashcards from the given extract. \
                Focus on key concepts, definitions, and relationships. \
                Return the flashcards in JSON format with 'question', 'answer', and 'type' fields. \
                The type can be 'basic' (Q&A), 'cloze' (fill-in-the-blank), or 'qa' (question-answer).",
            );

        let user_msg = if let Some(ctx) = context {
            format!("Context: {}\n\nExtract: {}", ctx, extract_content)
        } else {
            extract_content.to_string()
        };

        builder.add_user(user_msg)
    }
}

/// Q&A prompt
impl PromptBuilder {
    /// Create a prompt for answering questions about document content
    pub fn question_answering(question: &str, context: &str) -> Self {
        Self::new()
            .with_system(
                "You are a helpful assistant that answers questions based on the provided context. \
                Only use information from the context to answer. \
                If the context doesn't contain enough information to answer the question, say so.",
            )
            .add_user(format!(
                "Context:\n{}\n\nQuestion: {}",
                context, question
            ))
    }

    /// Create a prompt for answering questions about an extract
    pub fn extract_question(extract_content: &str, question: &str) -> Self {
        Self::new()
            .with_system(
                "You are a helpful assistant that answers questions based on the provided extract. \
                Be concise and accurate.",
            )
            .add_user(format!(
                "Extract:\n{}\n\nQuestion: {}",
                extract_content, question
            ))
    }
}

/// Summarization prompt
impl PromptBuilder {
    /// Create a prompt for summarizing content
    pub fn summarization(content: &str, max_length: usize) -> Self {
        Self::new()
            .with_system(format!(
                "You are an expert at creating clear, concise summaries. \
                Create a summary that captures the main points and key details. \
                Keep the summary under {} words.",
                max_length
            ))
            .add_user(format!("Summarize the following:\n\n{}", content))
    }

    /// Create a prompt for extracting key points
    pub fn key_points(content: &str, count: usize) -> Self {
        Self::new()
            .with_system(
                "You are an expert at identifying key information. \
                Extract the most important points from the content. \
                Return as a bulleted list.",
            )
            .add_user(format!(
                "Extract the top {} key points from:\n\n{}",
                count, content
            ))
    }

    /// Create a prompt for progressive disclosure summarization
    pub fn progressive_summary(content: &str, levels: &[u32]) -> Self {
        let levels_str: Vec<String> = levels
            .iter()
            .map(|l| format!("Level {}: {} words", l, l * 20))
            .collect();

        Self::new()
            .with_system(format!(
                "You are creating progressive disclosure summaries. \
                Create summaries at multiple detail levels. \
                Return in JSON format with a 'summaries' array containing objects with 'level' and 'summary' fields.\n\
                Levels:\n{}",
                levels_str.join("\n")
            ))
            .add_user(format!(
                "Create progressive summaries for:\n\n{}",
                content
            ))
    }
}

/// Content analysis prompt
impl PromptBuilder {
    /// Create a prompt for analyzing content difficulty
    pub fn difficulty_analysis(content: &str) -> Self {
        Self::new()
            .with_system(
                "Analyze the difficulty of the content on a scale of 1-10. \
                Consider vocabulary, complexity of concepts, and prior knowledge required. \
                Return as JSON with 'difficulty' (1-10), 'reasoning', and 'suggested_level' fields.",
            )
            .add_user(format!("Analyze the difficulty of:\n\n{}", content))
    }

    /// Create a prompt for suggesting categories
    pub fn category_suggestion(content: &str) -> Self {
        Self::new()
            .with_system(
                "Suggest appropriate categories for organizing this content. \
                Return as JSON with a 'categories' array of strings.",
            )
            .add_user(format!(
                "Suggest categories for:\n\n{}",
                content
            ))
    }

    /// Create a prompt for suggesting tags
    pub fn tag_suggestion(content: &str, count: usize) -> Self {
        Self::new()
            .with_system(format!(
                "Suggest {} relevant tags for this content. \
                Tags should be concise and descriptive. \
                Return as JSON with a 'tags' array.",
                count
            ))
            .add_user(format!("Suggest tags for:\n\n{}", content))
    }
}

/// Structured generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuredGeneration {
    pub items: Vec<GeneratedItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedItem {
    pub question: String,
    pub answer: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub level: Option<u32>,
}

/// Parse structured JSON response from AI
pub fn parse_structured_response(json_str: &str) -> Result<Vec<GeneratedItem>, String> {
    // Try to extract JSON from the response
    let json_str = json_str.trim();

    // Look for JSON array in the response
    let start = json_str.find('[').ok_or("No JSON array found")?;
    let end = json_str.rfind(']').ok_or("No JSON array end found")?;
    let json_slice = &json_str[start..=end];

    serde_json::from_str::<Vec<GeneratedItem>>(json_slice)
        .map_err(|e| format!("Failed to parse JSON: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prompt_builder_basic() {
        let builder = PromptBuilder::new()
            .with_system("You are a helpful assistant.")
            .add_user("Hello!")
            .add_assistant("Hi there!")
            .add_user("How are you?");

        let (messages, temp, max_tokens) = builder.build();

        assert_eq!(messages.len(), 4);
        assert_eq!(temp, 0.7);
        assert_eq!(max_tokens, 4096);
    }

    #[test]
    fn test_flashcard_generation_prompt() {
        let builder = PromptBuilder::flashcard_generation("Test content", 5);
        let messages = builder.build_messages();

        assert_eq!(messages.len(), 2); // System + User
        assert_eq!(messages[0].role, MessageRole::System);
        assert!(messages[0].content.contains("flashcards"));
    }

    #[test]
    fn test_qa_prompt() {
        let builder =
            PromptBuilder::question_answering("What is AI?", "AI stands for Artificial Intelligence.");
        let messages = builder.build_messages();

        assert_eq!(messages.len(), 2);
        assert!(messages[1].content.contains("What is AI?"));
    }
}
