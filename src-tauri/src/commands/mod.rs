//! Tauri commands

pub mod analytics;
pub mod algorithm;
pub mod ai;
pub mod document;
pub mod extract;
pub mod extract_bulk;
pub mod learning_item;
pub mod extract_review;
pub mod category;
pub mod queue;
pub mod queue_bulk;
pub mod review;
pub mod rss;
pub mod segmentation;
pub mod notifications;
pub mod mcp;
pub mod llm;
pub mod cloud;
pub mod scheduler;
pub mod legacy_import;
pub mod ocr;

// Re-export error types for use in commands
pub use crate::error::Result;

pub use analytics::*;
pub use algorithm::*;
pub use ai::*;
pub use document::*;
pub use extract::*;
pub use extract_bulk::*;
pub use learning_item::*;
pub use category::*;
pub use queue::*;
pub use queue_bulk::*;
pub use review::*;
pub use rss::*;
pub use segmentation::*;
pub use notifications::*;
pub use mcp::*;
pub use llm::*;
pub use legacy_import::*;
pub use ocr::*;
pub use extract_review::*;

// Cloud commands
pub use cloud::oauth::*;
pub use cloud::backup::*;
pub use cloud::sync::*;

// Scheduler commands
pub use scheduler::*;
