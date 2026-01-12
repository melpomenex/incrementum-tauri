//! Content summarization using AI
//!
//! Provides various summarization capabilities using LLMs.

use crate::ai::{
    providers::ChatCompletionRequest,
    prompts::PromptBuilder,
    AIProvider,
};

/// Summarizer
pub struct Summarizer {
    provider: AIProvider,
}

impl Summarizer {
    pub fn new(provider: AIProvider) -> Self {
        Self { provider }
    }

    /// Summarize content with max length
    pub async fn summarize(&self, content: &str, max_words: usize) -> Result<String, String> {
        let prompt = PromptBuilder::summarization(content, max_words);

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

    /// Extract key points from content
    pub async fn extract_key_points(
        &self,
        content: &str,
        count: usize,
    ) -> Result<Vec<String>, String> {
        let prompt = PromptBuilder::key_points(content, count);

        let (messages, temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: temp,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        // Parse bulleted list
        let points: Vec<String> = response
            .content
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| {
                line.trim()
                    .trim_start_matches(&['-', '•', '*', '·'][..])
                    .trim()
                    .to_string()
            })
            .filter(|line| !line.is_empty())
            .collect();

        Ok(points)
    }

    /// Create progressive disclosure summaries
    pub async fn progressive_summary(
        &self,
        content: &str,
        levels: &[u32],
    ) -> Result<Vec<ProgressiveSummary>, String> {
        let prompt = PromptBuilder::progressive_summary(content, levels);

        let (messages, temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: temp,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        // Parse JSON response
        let json_str = response.content.trim();
        let start = json_str.find('{').ok_or("No JSON object found")?;
        let json_slice = &json_str[start..];

        #[derive(serde::Deserialize)]
        struct Response {
            summaries: Vec<SummaryItem>,
        }

        #[derive(serde::Deserialize)]
        struct SummaryItem {
            level: u32,
            summary: String,
        }

        let parsed: Response = serde_json::from_str(json_slice)
            .map_err(|e| format!("Failed to parse progressive summary: {}", e))?;

        Ok(parsed
            .summaries
            .into_iter()
            .map(|s| {
                let word_count = s.summary.split_whitespace().count();
                ProgressiveSummary {
                    level: s.level,
                    summary: s.summary,
                    word_count,
                }
            })
            .collect())
    }

    /// Generate a title for content
    pub async fn generate_title(&self, content: &str) -> Result<String, String> {
        // Take first 500 characters for title generation
        let preview = &content[..content.chars().take(500).count()];

        let prompt = PromptBuilder::new()
            .with_system(
                "Generate a concise, descriptive title for the given content. \
                The title should be under 10 words and capture the main topic.",
            )
            .add_user(preview);

        let (messages, _temp, _max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: 0.5, // Lower for more focused titles
            max_tokens: 100,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        Ok(response.content.trim().to_string())
    }

    /// Generate abstract for academic/technical content
    pub async fn generate_abstract(&self, content: &str) -> Result<String, String> {
        let prompt = PromptBuilder::new()
            .with_system(
                "Generate an academic abstract for the provided content. \
                The abstract should include: background, methods (if applicable), key findings, and conclusions. \
                Keep it under 250 words.",
            )
            .add_user(content);

        let (messages, _temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: 0.6,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        Ok(response.content)
    }

    /// Generate simplified explanation
    pub async fn simplify(&self, content: &str, target_level: SimplificationLevel) -> Result<String, String> {
        let instruction = match target_level {
            SimplificationLevel::Elementary => "Explain this as if talking to a 10-year-old.",
            SimplificationLevel::HighSchool => "Explain this as if talking to a high school student.",
            SimplificationLevel::College => "Explain this as if talking to a college student.",
            SimplificationLevel::Expert => "Explain this for an expert audience (minimal simplification).",
        };

        let prompt = PromptBuilder::new()
            .with_system(format!(
                "{} Maintain accuracy while making the content more accessible.",
                instruction
            ))
            .add_user(content);

        let (messages, _temp, max_tokens) = prompt.build();

        let request = ChatCompletionRequest {
            messages,
            temperature: 0.6,
            max_tokens,
            stream: false,
        };

        let response = self.provider.chat_completion(&request).await?;

        Ok(response.content)
    }
}

/// Progressive summary
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProgressiveSummary {
    pub level: u32,
    pub summary: String,
    pub word_count: usize,
}

/// Simplification level
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SimplificationLevel {
    Elementary,
    HighSchool,
    College,
    Expert,
}

/// Document summary
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DocumentSummary {
    pub title: Option<String>,
    pub brief_summary: String,
    pub key_points: Vec<String>,
    pub progressive_summaries: Vec<ProgressiveSummary>,
    pub word_count: usize,
    pub reading_time_minutes: usize,
}

impl DocumentSummary {
    /// Calculate reading time (average 200 words per minute)
    pub fn calculate_reading_time(word_count: usize) -> usize {
        (word_count / 200).max(1)
    }
}

/// Batch summarizer for multiple documents
pub struct BatchSummarizer {
    summarizer: Summarizer,
}

impl BatchSummarizer {
    pub fn new(provider: AIProvider) -> Self {
        Self {
            summarizer: Summarizer::new(provider),
        }
    }

    /// Summarize multiple documents
    pub async fn summarize_multiple(
        &self,
        documents: Vec<(String, String)>, // (id, content)
        max_words: usize,
    ) -> Result<Vec<(String, String)>, String> {
        let mut summaries = Vec::new();

        for (id, content) in documents {
            match self.summarizer.summarize(&content, max_words).await {
                Ok(summary) => {
                    summaries.push((id, summary));
                }
                Err(e) => {
                    eprintln!("Failed to summarize document {}: {}", id, e);
                }
            }
        }

        Ok(summaries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::providers::{ChatCompletionResponse, LLMProvider, LLMProviderType};

    struct MockProvider {
        response: String,
    }

    #[async_trait::async_trait]
    impl LLMProvider for MockProvider {
        fn provider_type(&self) -> LLMProviderType {
            LLMProviderType::OpenAI
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
    async fn test_summarize() {
        let provider = Box::new(MockProvider {
            response: "This is a summary.".to_string(),
        });
        let summarizer = Summarizer::new(provider);

        let result = summarizer
            .summarize("Long content here...", 50)
            .await
            .unwrap();

        assert_eq!(result, "This is a summary.");
    }

    #[tokio::test]
    async fn test_extract_key_points() {
        let provider = Box::new(MockProvider {
            response: "- Point one\n- Point two\n- Point three".to_string(),
        });
        let summarizer = Summarizer::new(provider);

        let result = summarizer.extract_key_points("Content...", 3).await.unwrap();

        assert_eq!(result.len(), 3);
        assert_eq!(result[0], "Point one");
    }

    #[tokio::test]
    async fn test_generate_title() {
        let provider = Box::new(MockProvider {
            response: "The Future of AI".to_string(),
        });
        let summarizer = Summarizer::new(provider);

        let result = summarizer.generate_title("Content about AI...").await.unwrap();

        assert_eq!(result, "The Future of AI");
    }
}
