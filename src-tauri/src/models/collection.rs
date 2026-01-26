//! Collection models for organizing documents

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Type of collection
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CollectionType {
    /// Manual collection - user manually adds documents
    Manual,
    /// Smart collection - automatically populated based on filter rules
    Smart,
}

impl CollectionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CollectionType::Manual => "manual",
            CollectionType::Smart => "smart",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "manual" => Some(CollectionType::Manual),
            "smart" => Some(CollectionType::Smart),
            _ => None,
        }
    }
}

/// Collection for organizing documents
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub collection_type: CollectionType,
    /// For smart collections: JSON query/filter definition
    pub filter_query: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl Collection {
    pub fn new(name: String) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            parent_id: None,
            collection_type: CollectionType::Manual,
            filter_query: None,
            icon: None,
            color: None,
            created_at: now,
            modified_at: now,
        }
    }

    /// Create a manual collection
    pub fn manual(name: String) -> Self {
        Self::new(name)
    }

    /// Create a smart collection with a filter
    pub fn smart(name: String, filter_query: String) -> Self {
        let mut collection = Self::new(name);
        collection.collection_type = CollectionType::Smart;
        collection.filter_query = Some(filter_query);
        collection
    }

    /// Create a sub-collection
    pub fn with_parent(mut self, parent_id: String) -> Self {
        self.parent_id = Some(parent_id);
        self
    }

    /// Check if this is a smart collection
    pub fn is_smart(&self) -> bool {
        self.collection_type == CollectionType::Smart
    }
}

/// Association between a document and a collection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentCollection {
    pub document_id: String,
    pub collection_id: String,
    pub added_at: DateTime<Utc>,
}

impl DocumentCollection {
    pub fn new(document_id: String, collection_id: String) -> Self {
        Self {
            document_id,
            collection_id,
            added_at: Utc::now(),
        }
    }
}

/// Smart collection filter definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmartCollectionFilter {
    /// Tag filter (OR logic within tags)
    pub tags: Option<Vec<String>>,
    /// Exclude tags (AND logic - must not have these tags)
    pub exclude_tags: Option<Vec<String>>,
    /// Category filter
    pub category: Option<String>,
    /// File type filter
    pub file_type: Option<Vec<String>>,
    /// Progress range filter
    pub progress_min: Option<f32>,
    pub progress_max: Option<f32>,
    /// Date range filter (days ago)
    pub added_within_days: Option<u32>,
    /// Favorite filter
    pub is_favorite: Option<bool>,
    /// Archived filter
    pub is_archived: Option<bool>,
}

impl SmartCollectionFilter {
    /// Create a basic tag-based filter
    pub fn by_tags(tags: Vec<String>) -> Self {
        Self {
            tags: Some(tags),
            exclude_tags: None,
            category: None,
            file_type: None,
            progress_min: None,
            progress_max: None,
            added_within_days: None,
            is_favorite: None,
            is_archived: Some(false),
        }
    }

    /// Create a filter for recent documents
    pub fn recent(days: u32) -> Self {
        Self {
            tags: None,
            exclude_tags: None,
            category: None,
            file_type: None,
            progress_min: None,
            progress_max: None,
            added_within_days: Some(days),
            is_favorite: None,
            is_archived: Some(false),
        }
    }

    /// Create a filter for in-progress documents
    pub fn in_progress() -> Self {
        Self {
            tags: None,
            exclude_tags: None,
            category: None,
            file_type: None,
            progress_min: Some(1.0),
            progress_max: Some(99.0),
            added_within_days: None,
            is_favorite: None,
            is_archived: Some(false),
        }
    }

    /// Create a filter for favorites
    pub fn favorites() -> Self {
        Self {
            tags: None,
            exclude_tags: None,
            category: None,
            file_type: None,
            progress_min: None,
            progress_max: None,
            added_within_days: None,
            is_favorite: Some(true),
            is_archived: Some(false),
        }
    }

    /// Serialize to JSON for storage
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Deserialize from JSON
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

/// Common smart collection presets
impl Collection {
    /// "To Read" collection - not started documents
    pub fn to_read() -> Self {
        let filter = SmartCollectionFilter {
            tags: None,
            exclude_tags: None,
            category: None,
            file_type: None,
            progress_min: Some(0.0),
            progress_max: Some(0.0),
            added_within_days: None,
            is_favorite: None,
            is_archived: Some(false),
        };
        Self::smart(
            "To Read".to_string(),
            filter.to_json().unwrap_or_default(),
        )
    }

    /// "In Progress" collection - partially read documents
    pub fn in_progress() -> Self {
        let filter = SmartCollectionFilter::in_progress();
        Self::smart(
            "In Progress".to_string(),
            filter.to_json().unwrap_or_default(),
        )
    }

    /// "Completed" collection - fully read documents
    pub fn completed() -> Self {
        let filter = SmartCollectionFilter {
            tags: None,
            exclude_tags: None,
            category: None,
            file_type: None,
            progress_min: Some(99.0),
            progress_max: Some(100.0),
            added_within_days: None,
            is_favorite: None,
            is_archived: Some(false),
        };
        Self::smart(
            "Completed".to_string(),
            filter.to_json().unwrap_or_default(),
        )
    }

    /// "Favorites" collection
    pub fn favorites() -> Self {
        let filter = SmartCollectionFilter::favorites();
        Self::smart(
            "Favorites".to_string(),
            filter.to_json().unwrap_or_default(),
        )
    }

    /// "Recent" collection - documents added in last 7 days
    pub fn recent() -> Self {
        let filter = SmartCollectionFilter::recent(7);
        Self::smart(
            "Recent".to_string(),
            filter.to_json().unwrap_or_default(),
        )
    }
}
