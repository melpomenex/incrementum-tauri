//! Document model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub priority_score: f64,
    pub is_archived: bool,
    pub is_favorite: bool,
    pub metadata: Option<DocumentMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
            date_added: Utc::now(),
            date_modified: Utc::now(),
            date_last_reviewed: None,
            extract_count: 0,
            learning_item_count: 0,
            priority_score: 0.0,
            is_archived: false,
            is_favorite: false,
            metadata: None,
        }
    }
}
