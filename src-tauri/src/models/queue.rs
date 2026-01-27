//! Queue model

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueItem {
    pub id: String,
    pub document_id: String,
    pub document_title: String,
    pub extract_id: Option<String>,
    pub learning_item_id: Option<String>,
    pub question: Option<String>,
    pub answer: Option<String>,
    pub cloze_text: Option<String>,
    pub item_type: String, // "document", "extract", "learning-item"
    pub priority_rating: Option<i32>,
    pub priority_slider: Option<i32>,
    pub priority: f64,
    pub due_date: Option<String>,
    pub estimated_time: i32, // in minutes
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub progress: i32, // 0-100
}
