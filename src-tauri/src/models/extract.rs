//! Extract model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

// Re-export the shared MemoryState type
pub use super::learning_item::MemoryState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extract {
    pub id: String,
    pub document_id: String,
    /// Plain text content (for search, AI processing, and fallback display)
    pub content: String,
    /// Rich HTML content with inline styles for 1:1 visual fidelity
    pub html_content: Option<String>,
    /// Source URL for web extracts
    pub source_url: Option<String>,
    pub page_title: Option<String>,
    pub page_number: Option<i32>,
    pub selection_context: Option<JsonValue>,
    pub highlight_color: Option<String>,
    pub notes: Option<String>,
    pub progressive_disclosure_level: i32,
    pub max_disclosure_level: i32,
    pub date_created: DateTime<Utc>,
    pub date_modified: DateTime<Utc>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    /// FSRS Memory State (stability and difficulty)
    pub memory_state: Option<MemoryState>,
    /// Next scheduled review date for this extract
    pub next_review_date: Option<DateTime<Utc>>,
    /// Last review date
    pub last_review_date: Option<DateTime<Utc>>,
    /// Number of times this extract has been reviewed
    pub review_count: i32,
    /// Total repetitions/reviews
    pub reps: i32,
}

impl Extract {
    pub fn new(document_id: String, content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            document_id,
            content,
            html_content: None,
            source_url: None,
            page_title: None,
            page_number: None,
            selection_context: None,
            highlight_color: None,
            notes: None,
            progressive_disclosure_level: 0,
            max_disclosure_level: 3,
            date_created: Utc::now(),
            date_modified: Utc::now(),
            tags: Vec::new(),
            category: None,
            memory_state: None,
            next_review_date: None,
            last_review_date: None,
            review_count: 0,
            reps: 0,
        }
    }

    /// Create an extract with rich HTML content for visual fidelity
    pub fn with_html(document_id: String, content: String, html_content: String, source_url: Option<String>) -> Self {
        let mut extract = Self::new(document_id, content);
        extract.html_content = Some(html_content);
        extract.source_url = source_url;
        extract
    }
}
