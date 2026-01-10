//! Learning item model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// FSRS Memory State (stability and difficulty)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryState {
    pub stability: f64,
    pub difficulty: f64,
}

/// Rating for a review
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ReviewRating {
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

impl From<i32> for ReviewRating {
    fn from(value: i32) -> Self {
        match value {
            1 => ReviewRating::Again,
            2 => ReviewRating::Hard,
            3 => ReviewRating::Good,
            4 => ReviewRating::Easy,
            _ => ReviewRating::Good,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningItem {
    pub id: String,
    pub extract_id: Option<String>,
    pub document_id: Option<String>,
    pub item_type: ItemType,
    pub question: String,
    pub answer: Option<String>,
    pub cloze_text: Option<String>,
    pub cloze_ranges: Option<Vec<(usize, usize)>>,
    pub difficulty: i32,
    /// Interval in days (can be fractional for learning items, e.g., 0.1 = 2.4 hours)
    pub interval: f64,
    pub ease_factor: f64,
    pub due_date: DateTime<Utc>,
    pub date_created: DateTime<Utc>,
    pub date_modified: DateTime<Utc>,
    pub last_review_date: Option<DateTime<Utc>>,
    pub review_count: i32,
    pub lapses: i32,
    pub state: ItemState,
    pub is_suspended: bool,
    pub tags: Vec<String>,
    /// FSRS Memory State (stability and difficulty)
    pub memory_state: Option<MemoryState>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ItemType {
    Flashcard,
    Cloze,
    Qa,
    Basic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ItemState {
    New,
    Learning,
    Review,
    Relearning,
}

impl LearningItem {
    pub fn new(item_type: ItemType, question: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            extract_id: None,
            document_id: None,
            item_type,
            question,
            answer: None,
            cloze_text: None,
            cloze_ranges: None,
            difficulty: 3,
            interval: 0.0,
            ease_factor: 2.5,
            due_date: now,
            date_created: now,
            date_modified: now,
            last_review_date: None,
            review_count: 0,
            lapses: 0,
            state: ItemState::New,
            is_suspended: false,
            tags: Vec::new(),
            memory_state: None,
        }
    }

    pub fn with_answer(document_id: String, item_type: ItemType, question: String, answer: String) -> Self {
        let mut item = Self::new(item_type, question);
        item.document_id = Some(document_id);
        item.answer = Some(answer);
        item
    }

    pub fn from_extract(extract_id: String, document_id: String, item_type: ItemType, question: String, answer: Option<String>) -> Self {
        let mut item = Self::new(item_type, question);
        item.extract_id = Some(extract_id);
        item.document_id = Some(document_id);
        item.answer = answer;
        item
    }
}
