//! OCR Tauri commands
//!
//! Provides Tauri commands for OCR operations

use crate::error::{IncrementumError, Result};
use crate::ocr::OCRConfig;
use crate::ocr::providers::OCRProviderType;
use crate::ocr::processor::OCRProcessor;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::OnceLock;
use tokio::sync::Mutex as TokioMutex;

/// Global OCR processor
static OCR_PROCESSOR: OnceLock<TokioMutex<Option<OCRProcessor>>> = OnceLock::new();

fn get_processor() -> &'static TokioMutex<Option<OCRProcessor>> {
    OCR_PROCESSOR.get_or_init(|| TokioMutex::new(None))
}

/// OCR request for image file
#[derive(Debug, Deserialize)]
pub struct OCRImageRequest {
    /// Path to the image file
    pub image_path: PathBuf,
    /// Optional provider override
    pub provider: Option<String>,
    /// Optional language
    pub language: Option<String>,
}

/// OCR request for image bytes
#[derive(Debug, Deserialize)]
pub struct OCRBytesRequest {
    /// Base64 encoded image data
    pub image_data: String,
    /// Optional provider override
    pub provider: Option<String>,
    /// Optional language
    pub language: Option<String>,
}

/// OCR response
#[derive(Debug, Serialize)]
pub struct OCRResponse {
    /// Extracted text
    pub text: String,
    /// Confidence score (0-100)
    pub confidence: f64,
    /// Number of lines detected
    pub line_count: usize,
    /// Number of words detected
    pub word_count: usize,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
    /// Provider used
    pub provider: String,
    /// Success status
    pub success: bool,
    /// Error message if failed
    pub error: Option<String>,
}

/// Key phrase extraction request
#[derive(Debug, Deserialize)]
pub struct KeyPhraseRequest {
    /// Text to extract key phrases from
    pub text: String,
    /// Maximum number of phrases to return
    pub max_phrases: Option<usize>,
}

/// Key phrase response
#[derive(Debug, Serialize)]
pub struct KeyPhraseResponse {
    /// Extracted key phrases
    pub phrases: Vec<KeyPhrase>,
}

/// Key phrase with relevance score
#[derive(Debug, Serialize, Clone)]
pub struct KeyPhrase {
    /// The phrase text
    pub text: String,
    /// Relevance score (0-1)
    pub score: f64,
}

/// Initialize OCR processor with configuration
#[tauri::command]
pub async fn init_ocr(config: OCRConfig) -> Result<()> {
    let processor = OCRProcessor::new(config);
    let mut guard = get_processor().lock().await;
    *guard = Some(processor);
    Ok(())
}

/// Perform OCR on an image file
#[tauri::command]
pub async fn ocr_image_file(request: OCRImageRequest) -> Result<OCRResponse> {
    let processor = {
        let guard = get_processor().lock().await;
        guard.as_ref()
            .ok_or_else(|| IncrementumError::Internal("OCR processor not initialized".to_string()))?
            .clone()
    };

    let start = std::time::Instant::now();

    let result = processor.process_image(&request.image_path).await;

    let processing_time_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(ocr_result) => Ok(OCRResponse {
            text: ocr_result.text,
            confidence: ocr_result.confidence,
            line_count: ocr_result.line_count,
            word_count: ocr_result.word_count,
            processing_time_ms,
            provider: format!("{:?}", ocr_result.provider),
            success: true,
            error: None,
        }),
        Err(e) => Ok(OCRResponse {
            text: String::new(),
            confidence: 0.0,
            line_count: 0,
            word_count: 0,
            processing_time_ms,
            provider: "unknown".to_string(),
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Perform OCR on image bytes (base64 encoded)
#[tauri::command]
pub async fn ocr_image_bytes(request: OCRBytesRequest) -> Result<OCRResponse> {
    let processor = {
        let guard = get_processor().lock().await;
        guard.as_ref()
            .ok_or_else(|| IncrementumError::Internal("OCR processor not initialized".to_string()))?
            .clone()
    };

    // Decode base64
    let image_data = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        request.image_data.as_bytes(),
    ).map_err(|e| IncrementumError::Internal(format!("Failed to decode base64: {}", e)))?;

    let start = std::time::Instant::now();

    let result = processor.process_image_bytes(&image_data).await;

    let processing_time_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(ocr_result) => Ok(OCRResponse {
            text: ocr_result.text,
            confidence: ocr_result.confidence,
            line_count: ocr_result.line_count,
            word_count: ocr_result.word_count,
            processing_time_ms,
            provider: format!("{:?}", ocr_result.provider),
            success: true,
            error: None,
        }),
        Err(e) => Ok(OCRResponse {
            text: String::new(),
            confidence: 0.0,
            line_count: 0,
            word_count: 0,
            processing_time_ms,
            provider: "unknown".to_string(),
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Extract key phrases from text using RAKE algorithm
#[tauri::command]
pub fn extract_key_phrases(request: KeyPhraseRequest) -> Result<KeyPhraseResponse> {
    let max_phrases = request.max_phrases.unwrap_or(10);
    let phrases = extract_phrases_rake(&request.text, max_phrases);
    Ok(KeyPhraseResponse { phrases })
}

/// Simple RAKE (Rapid Automatic Keyword Extraction) implementation
fn extract_phrases_rake(text: &str, max_phrases: usize) -> Vec<KeyPhrase> {
    // Define stop words
    let stop_words = vec![
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
        "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between",
        "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do",
        "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from",
        "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
        "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his",
        "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
        "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
        "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
        "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll",
        "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
        "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
        "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
        "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've",
        "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while",
        "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you",
        "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
    ];

    let stop_word_set: std::collections::HashSet<&str> = stop_words.iter().cloned().collect();

    // Split text into sentences
    let sentences: Vec<&str> = text.split(&['.', '!', '?', '\n'][..])
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    // Extract candidate phrases
    let mut phrases: Vec<String> = Vec::new();
    for sentence in sentences {
        let words: Vec<&str> = sentence.split_whitespace().collect();
        let mut current_phrase = Vec::new();

        for word in words {
            let clean_word = word.to_lowercase()
                .chars().filter(|c| c.is_alphabetic() || c.is_whitespace())
                .collect::<String>();

            if stop_word_set.contains(clean_word.as_str()) || clean_word.len() <= 2 {
                if !current_phrase.is_empty() {
                    phrases.push(current_phrase.join(" "));
                    current_phrase.clear();
                }
            } else {
                current_phrase.push(word);
            }
        }

        if !current_phrase.is_empty() {
            phrases.push(current_phrase.join(" "));
        }
    }

    // Score phrases by word frequency and degree
    let mut word_scores: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    let mut phrase_degrees: std::collections::HashMap<String, f64> = std::collections::HashMap::new();

    for phrase in &phrases {
        let words: Vec<&str> = phrase.split_whitespace().collect();
        let degree = words.len() as f64 - 1.0;

        for word in &words {
            let word_lower = word.to_lowercase();
            *word_scores.entry(word_lower.clone()).or_insert(0.0) += 1.0;
            *phrase_degrees.entry(phrase.clone()).or_insert(0.0) += degree;
        }
    }

    // Calculate final scores
    let mut scored_phrases: Vec<KeyPhrase> = phrases.into_iter()
        .map(|phrase| {
            let words: Vec<&str> = phrase.split_whitespace().collect();
            let word_score_sum: f64 = words.iter()
                .map(|w| word_scores.get(&w.to_lowercase()).copied().unwrap_or(0.0))
                .sum();

            let degree = phrase_degrees.get(&phrase).copied().unwrap_or(0.0);
            let score = if word_score_sum > 0.0 {
                degree / word_score_sum
            } else {
                0.0
            };

            KeyPhrase {
                text: phrase,
                score: score.min(1.0),
            }
        })
        .filter(|kp| kp.score > 0.0)
        .collect();

    // Sort by score and limit
    scored_phrases.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    scored_phrases.truncate(max_phrases);

    scored_phrases
}

/// Get available OCR providers
#[tauri::command]
pub async fn get_available_ocr_providers() -> Result<Vec<String>> {
    let guard = get_processor().lock().await;
    let processor = guard.as_ref()
        .ok_or_else(|| IncrementumError::Internal("OCR processor not initialized".to_string()))?;

    let providers = processor.get_available_providers();
    Ok(providers.into_iter().map(|p| format!("{:?}", p)).collect())
}

/// Check if a specific provider is available
#[tauri::command]
pub async fn is_provider_available(provider: String) -> Result<bool> {
    let guard = get_processor().lock().await;
    let processor = guard.as_ref()
        .ok_or_else(|| IncrementumError::Internal("OCR processor not initialized".to_string()))?;

    let provider_type = match provider.as_str() {
        "tesseract" => OCRProviderType::Tesseract,
        "google" => OCRProviderType::GoogleDocumentAI,
        "aws" => OCRProviderType::AWSTextract,
        "azure" => OCRProviderType::AzureVision,
        _ => return Err(IncrementumError::Internal(format!("Unknown provider: {}", provider))),
    };

    Ok(processor.is_provider_available(provider_type))
}

/// Get current OCR configuration
#[tauri::command]
pub async fn get_ocr_config() -> Result<OCRConfig> {
    let guard = get_processor().lock().await;
    let processor = guard.as_ref()
        .ok_or_else(|| IncrementumError::Internal("OCR processor not initialized".to_string()))?;

    Ok(processor.get_config().clone())
}

/// Update OCR configuration
#[tauri::command]
pub async fn update_ocr_config(config: OCRConfig) -> Result<()> {
    let mut guard = get_processor().lock().await;
    *guard = Some(OCRProcessor::new(config));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_key_phrases() {
        let text = "Optical character recognition (OCR) is technology that converts different types of \
                    documents, such as scanned paper documents, PDF files or images captured by a digital \
                    camera into editable and searchable data.";

        let request = KeyPhraseRequest {
            text: text.to_string(),
            max_phrases: Some(5),
        };

        let response = extract_key_phrases(request).unwrap();
        assert!(!response.phrases.is_empty());
        assert!(response.phrases.len() <= 5);

        // Check that phrases are sorted by score
        for i in 1..response.phrases.len() {
            assert!(response.phrases[i - 1].score >= response.phrases[i].score);
        }
    }

    #[test]
    fn test_extract_key_phrases_filters_stop_words() {
        let text = "The quick brown fox jumps over the lazy dog. The fox is very quick.";

        let request = KeyPhraseRequest {
            text: text.to_string(),
            max_phrases: Some(10),
        };

        let response = extract_key_phrases(request).unwrap();

        // Check that stop words are filtered out
        for phrase in &response.phrases {
            assert!(!["the", "is", "over", "very"].contains(&phrase.text.to_lowercase().as_str()));
        }
    }

    #[test]
    fn test_extract_key_phrases_with_empty_text() {
        let request = KeyPhraseRequest {
            text: String::new(),
            max_phrases: Some(5),
        };

        let response = extract_key_phrases(request).unwrap();
        assert_eq!(response.phrases.len(), 0);
    }

    #[test]
    fn test_extract_key_phrases_with_repeated_words() {
        let text = "Machine learning machine learning algorithms algorithms algorithms.";

        let request = KeyPhraseRequest {
            text: text.to_string(),
            max_phrases: Some(3),
        };

        let response = extract_key_phrases(request).unwrap();
        assert!(!response.phrases.is_empty());

        // "Machine learning" or "algorithms" should be top phrases
        let top_phrase = &response.phrases[0];
        assert!(top_phrase.text.contains("Machine") || top_phrase.text.contains("algorithms"));
    }

    #[test]
    fn test_extract_key_phrases_score_range() {
        let text = "Rust programming language memory safety performance concurrency.";

        let request = KeyPhraseRequest {
            text: text.to_string(),
            max_phrases: Some(10),
        };

        let response = extract_key_phrases(request).unwrap();

        // Check that all scores are between 0 and 1
        for phrase in &response.phrases {
            assert!(phrase.score >= 0.0);
            assert!(phrase.score <= 1.0);
        }
    }
}
