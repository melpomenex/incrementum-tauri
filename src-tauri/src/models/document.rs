//! Document model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: String,
    pub title: String,
    pub file_path: String,
    pub file_type: FileType,
    pub content: Option<String>,  // Extracted text content
    pub content_hash: Option<String>,
    pub total_pages: Option<i32>,
    pub current_page: Option<i32>,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub date_added: DateTime<Utc>,
    pub date_modified: DateTime<Utc>,
    pub date_last_reviewed: Option<DateTime<Utc>>,
    pub extract_count: i32,
    pub learning_item_count: i32,
    pub priority_rating: i32,
    pub priority_slider: i32,
    pub priority_score: f64,
    pub is_archived: bool,
    pub is_favorite: bool,
    pub metadata: Option<DocumentMetadata>,

    // Scheduling fields for incremental reading
    /// Next scheduled reading date for this document
    pub next_reading_date: Option<DateTime<Utc>>,
    /// Number of times this document has been read
    pub reading_count: i32,
    /// FSRS stability (how long memory lasts, in days)
    pub stability: Option<f64>,
    /// FSRS difficulty (1-10 scale)
    pub difficulty: Option<f64>,
    /// Total repetitions/reviews
    pub reps: Option<i32>,
    /// Total time spent reading (in seconds)
    pub total_time_spent: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Pdf,
    Epub,
    Markdown,
    Html,
    Youtube,
    Audio,
    Video,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentMetadata {
    pub author: Option<String>,
    pub subject: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub created_at: Option<DateTime<Utc>>,
    pub modified_at: Option<DateTime<Utc>>,
    pub file_size: Option<i64>,
    pub language: Option<String>,
    pub page_count: Option<i32>,
    pub word_count: Option<i32>,
}

impl Document {
    pub fn new(title: String, file_path: String, file_type: FileType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            file_path,
            file_type,
            content: None,
            content_hash: None,
            total_pages: None,
            current_page: None,
            category: None,
            tags: Vec::new(),
            date_added: now,
            date_modified: now,
            date_last_reviewed: None,
            extract_count: 0,
            learning_item_count: 0,
            priority_rating: 0,
            priority_slider: 50,  // Default to neutral priority (50 = 1.0x multiplier)
            priority_score: 0.0,
            is_archived: false,
            is_favorite: false,
            metadata: None,
            // FSRS scheduling fields - initialize with default FSRS state
            // New documents are "due now" with zero stability and medium difficulty
            next_reading_date: Some(now),  // Due immediately for first reading
            reading_count: 0,
            stability: Some(0.0),  // No stability yet (new document)
            difficulty: Some(5.0),  // Medium difficulty default (1-10 scale)
            reps: Some(0),  // No repetitions yet
            total_time_spent: Some(0),  // No time spent yet
        }
    }
}
