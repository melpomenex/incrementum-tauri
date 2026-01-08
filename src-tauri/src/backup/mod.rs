//! Backup module
//!
//! Handles backup and restore operations

pub mod manager;

// Re-export backup manager
pub use manager::BackupManager;
