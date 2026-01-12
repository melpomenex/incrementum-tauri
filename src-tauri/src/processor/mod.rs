//! Document processing and content extraction

pub mod pdf;
pub mod epub;
pub mod markdown;
pub mod html;

use crate::error::Result;
use crate::models::FileType;
use std::path::Path;

pub struct ExtractedContent {
    pub text: String,
    pub title: Option<String>,
    pub author: Option<String>,
    pub page_count: Option<usize>,
    pub metadata: serde_json::Value,
}

/// Extract content from a document file
pub async fn extract_content(file_path: &str, file_type: FileType) -> Result<ExtractedContent> {
    let path = Path::new(file_path);

    if !path.exists() {
        return Err(crate::error::IncrementumError::NotFound(format!(
            "File not found: {}",
            file_path
        )));
    }

    match file_type {
        FileType::Pdf => pdf::extract_pdf_content(file_path).await,
        FileType::Epub => epub::extract_epub_content(file_path).await,
        FileType::Markdown => markdown::extract_markdown_content(file_path).await,
        FileType::Html => html::extract_html_content(file_path).await,
        _ => Ok(ExtractedContent {
            text: String::new(),
            title: None,
            author: None,
            page_count: None,
            metadata: serde_json::json!({}),
        }),
    }
}

/// Generate a content hash for duplicate detection
pub fn generate_content_hash(content: &str) -> String {
    use std::hash::{Hash, Hasher};
    use std::collections::hash_map::DefaultHasher;

    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

/// Check if content appears to be duplicate based on similarity threshold
pub fn is_duplicate_content(content1: &str, content2: &str, threshold: f64) -> bool {
    if content1.is_empty() || content2.is_empty() {
        return false;
    }

    // Simple Jaccard similarity for words
    let words1: std::collections::HashSet<&str> = content1.split_whitespace().collect();
    let words2: std::collections::HashSet<&str> = content2.split_whitespace().collect();

    if words1.is_empty() || words2.is_empty() {
        return false;
    }

    let intersection = words1.intersection(&words2).count();
    let union = words1.union(&words2).count();

    let similarity = intersection as f64 / union as f64;
    similarity >= threshold
}
