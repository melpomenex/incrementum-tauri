//! Question answering with document context
//!
//! Provides Q&A capabilities using AI with document context.

use crate::ai::{
    providers::ChatCompletionRequest,
    prompts::PromptBuilder,
    AIProvider, Message, MessageRole,
};

/// Question answerer
pub struct QuestionAnswerer {
    provider: AIProvider,
}

impl QuestionAnswerer {
    pub fn new(provider: AIProvider) -> Self {
        Self { provider }
    }

    /// Answer a question with document context
    pub async fn answer_with_context(
        &self,
        question: &str,
        context: &str,
    ) -> Result<String, String> {
        let prompt = PromptBuilder::question_answering(question, context);

        let (messages, temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: temp,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        Ok(response.content)
    }

    /// Answer a question about an extract
    pub async fn answer_about_extract(
        &self,
        extract_content: &str,
        question: &str,
    ) -> Result<String, String> {
        let prompt = PromptBuilder::extract_question(extract_content, question);

        let (messages, temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: temp,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        Ok(response.content)
    }

    /// Answer multiple questions about a document
    pub async fn answer_multiple(
        &self,
        questions: Vec<String>,
        context: &str,
    ) -> Result<Vec<QuestionAnswer>, String> {
        let mut answers = Vec::new();

        for question in questions {
            match self.answer_with_context(&question, context).await {
                Ok(answer) => {
                    answers.push(QuestionAnswer {
                        question,
                        answer,
                        tokens_used: 0,
                    });
                }
                Err(e) => {
                    eprintln!("Failed to answer question '{}': {}", question, e);
                    answers.push(QuestionAnswer {
                        question,
                        answer: format!("Error: {}", e),
                        tokens_used: 0,
                    });
                }
            }
        }

        Ok(answers)
    }

    /// Generate questions from content
    pub async fn generate_questions(
        &self,
        content: &str,
        count: usize,
    ) -> Result<Vec<String>, String> {
        let prompt = PromptBuilder::new()
            .with_system(format!(
                "Generate {} thoughtful questions about the provided content. \
                Questions should test understanding and critical thinking. \
                Return as a JSON array of strings.",
                count
            ))
            .add_user(content);

        let (messages, _temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: 0.8, // Higher temperature for more diverse questions
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        // Parse the JSON array of questions
        let json_str = response.content.trim();
        let start = json_str.find('[').ok_or("No JSON array found")?;
        let end = json_str.rfind(']').ok_or("No JSON array end found")?;
        let json_slice = &json_str[start..=end];

        serde_json::from_str::<Vec<String>>(json_slice)
            .map_err(|e| format!("Failed to parse questions: {}", e))
    }
}

/// Question and answer pair
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QuestionAnswer {
    pub question: String,
    pub answer: String,
    pub tokens_used: u32,
}

/// Chat session for ongoing conversation
pub struct ChatSession {
    provider: AIProvider,
    context: String,
    messages: Vec<Message>,
}

impl ChatSession {
    pub fn new(provider: AIProvider, context: String) -> Self {
        Self {
            provider,
            context,
            messages: Vec::new(),
        }
    }

    /// Send a message in the chat session
    pub async fn send_message(&mut self, message: &str) -> Result<String, String> {
        // Add user message
        self.messages.push(Message::user(message.to_string()));

        // Build prompt with context and conversation history
        let mut prompt = PromptBuilder::new()
            .with_system(
                "You are a helpful assistant answering questions about the provided document context. \
                Be concise but thorough.",
            )
            .add_user(format!("Document context:\n\n{}", self.context));

        // Add conversation history
        for msg in &self.messages {
            prompt = match msg.role {
                MessageRole::User => prompt.add_user(&msg.content),
                MessageRole::Assistant => prompt.add_assistant(&msg.content),
                MessageRole::System => prompt,
            };
        }

        let (messages, temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: temp,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        // Add assistant response to history
        self.messages.push(Message::assistant(response.content.clone()));

        Ok(response.content)
    }

    /// Clear conversation history
    pub fn clear_history(&mut self) {
        self.messages.clear();
    }

    /// Get conversation history
    pub fn history(&self) -> &[Message] {
        &self.messages
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::providers::{ChatCompletionRequest, ChatCompletionResponse, LLMProvider};
    use crate::ai::AIProvider;

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
                output_tokens: 50,
                finish_reason: "stop".to_string(),
            })
        }

        fn is_available(&self) -> bool {
            true
        }
    }

    #[tokio::test]
    async fn test_answer_with_context() {
        let provider = AIProvider::Mock(Box::new(MockProvider {
            response: "AI (Artificial Intelligence) is a field of computer science.".to_string(),
        }));
        let qa = QuestionAnswerer::new(provider);

        let result = qa
            .answer_with_context("What is AI?", "AI stands for Artificial Intelligence.")
            .await
            .unwrap();

        assert!(result.contains("AI"));
    }

    #[tokio::test]
    async fn test_chat_session() {
        let provider = AIProvider::Mock(Box::new(MockProvider {
            response: "That's correct!".to_string(),
        }));
        let mut session = ChatSession::new(provider, "Test document content.".to_string());

        let response = session.send_message("Hello").await.unwrap();
        assert_eq!(response, "That's correct!");
        assert_eq!(session.history().len(), 2); // User + Assistant
    }
}
