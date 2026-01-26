//! Position tracking models for incremental reading

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Unified position representation for all document types
/// This abstracts the different ways positions are tracked:
/// - PDF: page numbers
/// - EPUB: Canonical Fragment Identifiers (CFI)
/// - HTML/Markdown: scroll percentage
/// - Video: time in seconds
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DocumentPosition {
    /// Page-based position (PDF, DJVU)
    Page {
        page: u32,
        /// Optional offset within the page (0.0 to 1.0)
        #[serde(skip_serializing_if = "Option::is_none")]
        offset: Option<f32>,
    },
    /// Scroll-based position (HTML, Markdown, plain text)
    Scroll {
        /// Percentage from 0.0 to 100.0
        percent: f32,
        /// Optional element ID for anchor-based positioning
        #[serde(skip_serializing_if = "Option::is_none")]
        element_id: Option<String>,
    },
    /// EPUB Canonical Fragment Identifier
    Cfi {
        /// The CFI string (e.g., "/body/DocFragment[2]/chap1[4]!")
        cfi: String,
        /// Optional offset within the CFI location (0.0 to 1.0)
        #[serde(skip_serializing_if = "Option::is_none")]
        offset: Option<f32>,
    },
    /// Time-based position (video, audio)
    Time {
        /// Position in seconds
        seconds: u32,
        /// Total duration in seconds (for progress calculation)
        #[serde(skip_serializing_if = "Option::is_none")]
        total_duration: Option<u32>,
    },
}

impl DocumentPosition {
    /// Calculate progress as a percentage (0.0 to 100.0)
    /// Returns None if progress cannot be determined
    pub fn progress_percent(&self) -> Option<f32> {
        match self {
            DocumentPosition::Page { page, .. } => {
                // Without total pages, we can't calculate percentage
                None
            }
            DocumentPosition::Scroll { percent, .. } => Some(*percent),
            DocumentPosition::Cfi { .. } => {
                // CFI doesn't directly give us progress
                None
            }
            DocumentPosition::Time {
                seconds,
                total_duration,
            } => {
                if let Some(total) = total_duration {
                    if *total > 0 {
                        Some((*seconds as f32 / *total as f32) * 100.0)
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        }
    }

    /// Set total for progress calculation (pages for PDF, duration for video)
    pub fn with_total(self, total: u32) -> DocumentPosition {
        match self {
            DocumentPosition::Page { page, offset } => {
                // Store total in a way we can use for progress
                DocumentPosition::Page { page, offset }
            }
            DocumentPosition::Time {
                seconds,
                total_duration: _,
            } => DocumentPosition::Time {
                seconds,
                total_duration: Some(total),
            },
            _ => self,
        }
    }

    /// Create a page position
    pub fn page(page: u32) -> Self {
        DocumentPosition::Page {
            page,
            offset: None,
        }
    }

    /// Create a page position with offset
    pub fn page_with_offset(page: u32, offset: f32) -> Self {
        DocumentPosition::Page {
            page,
            offset: Some(offset),
        }
    }

    /// Create a scroll position
    pub fn scroll(percent: f32) -> Self {
        DocumentPosition::Scroll {
            percent: percent.clamp(0.0, 100.0),
            element_id: None,
        }
    }

    /// Create a scroll position with element anchor
    pub fn scroll_with_element(percent: f32, element_id: String) -> Self {
        DocumentPosition::Scroll {
            percent: percent.clamp(0.0, 100.0),
            element_id: Some(element_id),
        }
    }

    /// Create a CFI position
    pub fn cfi(cfi: String) -> Self {
        DocumentPosition::Cfi {
            cfi,
            offset: None,
        }
    }

    /// Create a CFI position with offset
    pub fn cfi_with_offset(cfi: String, offset: f32) -> Self {
        DocumentPosition::Cfi {
            cfi,
            offset: Some(offset),
        }
    }

    /// Create a time position
    pub fn time(seconds: u32) -> Self {
        DocumentPosition::Time {
            seconds,
            total_duration: None,
        }
    }

    /// Create a time position with duration
    pub fn time_with_duration(seconds: u32, duration: u32) -> Self {
        DocumentPosition::Time {
            seconds,
            total_duration: Some(duration),
        }
    }

    /// Get the position type as a string
    pub fn type_name(&self) -> &'static str {
        match self {
            DocumentPosition::Page { .. } => "page",
            DocumentPosition::Scroll { .. } => "scroll",
            DocumentPosition::Cfi { .. } => "cfi",
            DocumentPosition::Time { .. } => "time",
        }
    }
}

impl fmt::Display for DocumentPosition {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DocumentPosition::Page { page, offset } => {
                if let Some(off) = offset {
                    write!(f, "Page {} ({:.0}%)", page, off * 100.0)
                } else {
                    write!(f, "Page {}", page)
                }
            }
            DocumentPosition::Scroll { percent, .. } => {
                write!(f, "{:.1}%", percent)
            }
            DocumentPosition::Cfi { cfi, .. } => {
                write!(f, "CFF: {}", cfi)
            }
            DocumentPosition::Time { seconds, total_duration } => {
                if let Some(total) = total_duration {
                    write!(f, "{}:{:02} / {}:{:02}", seconds / 60, seconds % 60, total / 60, total % 60)
                } else {
                    write!(f, "{}:{:02}", seconds / 60, seconds % 60)
                }
            }
        }
    }
}

/// Bookmark for a specific position in a document
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bookmark {
    pub id: String,
    pub document_id: String,
    pub name: String,
    pub position: DocumentPosition,
    /// Base64-encoded thumbnail image data (optional)
    pub thumbnail: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl Bookmark {
    pub fn new(document_id: String, name: String, position: DocumentPosition) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            document_id,
            name,
            position,
            thumbnail: None,
            created_at: Utc::now(),
        }
    }
}

/// Reading session tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingSession {
    pub id: String,
    pub document_id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_seconds: u32,
    pub pages_read: Option<u32>,
    pub progress_start: f32,
    pub progress_end: f32,
}

impl ReadingSession {
    pub fn new(document_id: String, progress_start: f32) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            document_id,
            started_at: Utc::now(),
            ended_at: None,
            duration_seconds: 0,
            pages_read: None,
            progress_start,
            progress_end: progress_start,
        }
    }

    /// End the session and calculate duration
    pub fn end(&mut self, progress_end: f32) {
        self.ended_at = Some(Utc::now());
        self.progress_end = progress_end;
        let duration = Utc::now() - self.started_at;
        self.duration_seconds = duration.num_seconds() as u32;
    }

    /// Get the actual reading progress made during this session
    pub fn progress_made(&self) -> f32 {
        self.progress_end - self.progress_start
    }
}

/// Daily reading statistics for streaks and goals
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReadingStats {
    pub date: String, // YYYY-MM-DD format
    pub total_seconds: u32,
    pub documents_read: u32,
    pub total_pages_read: u32,
    pub session_count: u32,
}

impl DailyReadingStats {
    /// Get reading time in minutes
    pub fn minutes(&self) -> u32 {
        self.total_seconds / 60
    }

    /// Check if this day has any reading activity
    pub fn has_activity(&self) -> bool {
        self.total_seconds > 0
    }
}
