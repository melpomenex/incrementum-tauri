//! Cloud storage provider implementations
//!
//! This module provides support for various cloud storage providers
//! including OneDrive, Google Drive, and Dropbox.

pub mod provider;
pub mod onedrive;
pub mod googledrive;
pub mod dropbox;

// Re-export commonly used types
pub use provider::{
    AccountInfo,
    AuthResult,
    AuthToken,
    BackupIncludes,
    BackupInfo,
    BackupOptions,
    CloudProvider,
    CloudProviderType,
    ConflictResolution,
    FileInfo,
    FileMetadata,
    RestoreConflict,
    RestoreResult,
    StorageQuota,
    SyncConflict,
    SyncMode,
    SyncResult,
};

// Re-export provider configurations and implementations
pub use onedrive::{OneDriveConfig, OneDriveProvider};
pub use googledrive::{GoogleDriveConfig, GoogleDriveProvider};
pub use dropbox::{DropboxConfig, DropboxProvider};
