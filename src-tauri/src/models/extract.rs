//! Extract model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extract {
    pub id: String,
    pub document_id: String,
    pub content: String,
    pub page_title: Option<String>,
    pub page_number: Option<i32>,
    pub highlight_color: Option<String>,
    pub notes: Option<String>,
    pub progressive_disclosure_level: i32,
    pub max_disclosure_level: i32,
    pub date_created: DateTime<Utc>,
    pub date_modified: DateTime<Utc>,
    pub tags: Vec<String>,
    pub category: Option<String>,
}

impl Extract {
    pub fn new(document_id: String, content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            document_id,
            content,
            page_title: None,
            page_number: None,
            highlight_color: None,
            notes: None,
            progressive_disclosure_level: 0,
            max_disclosure_level: 3,
            date_created: Utc::now(),
            date_modified: Utc::now(),
            tags: Vec::new(),
            category: None,
        }
    }
}
