//! Cloud Provider Trait
//!
//! Defines the interface that all cloud storage providers must implement.
//! Supports OneDrive, Google Drive, and Dropbox.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::error::AppError;

/// Cloud storage provider type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CloudProviderType {
    OneDrive,
    GoogleDrive,
    Dropbox,
}

impl CloudProviderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CloudProviderType::OneDrive => "onedrive",
            CloudProviderType::GoogleDrive => "google-drive",
            CloudProviderType::Dropbox => "dropbox",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "onedrive" => Some(CloudProviderType::OneDrive),
            "google-drive" => Some(CloudProviderType::GoogleDrive),
            "dropbox" => Some(CloudProviderType::Dropbox),
            _ => None,
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            CloudProviderType::OneDrive => "OneDrive",
            CloudProviderType::GoogleDrive => "Google Drive",
            CloudProviderType::Dropbox => "Dropbox",
        }
    }
}

impl std::fmt::Display for CloudProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Account information from cloud provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub account_id: String,
    pub account_name: String,
    pub email: Option<String>,
    pub storage_quota: Option<StorageQuota>,
}

/// Storage quota information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageQuota {
    pub used: u64,
    pub total: u64,
}

impl StorageQuota {
    pub fn available(&self) -> u64 {
        self.total.saturating_sub(self.used)
    }

    pub fn used_percentage(&self) -> f64 {
        if self.total == 0 {
            return 0.0;
        }
        (self.used as f64 / self.total as f64) * 100.0
    }
}

/// File information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified_time: DateTime<Utc>,
    pub is_folder: bool,
    pub mime_type: Option<String>,
}

/// File metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub created_time: Option<DateTime<Utc>>,
    pub modified_time: DateTime<Utc>,
    pub checksum: Option<String>,
}

/// Authentication token information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
    pub token_type: String,
}

impl AuthToken {
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// OAuth callback result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
    pub success: bool,
    pub account_info: Option<AccountInfo>,
    pub error: Option<String>,
}

/// Cloud provider trait
/// All cloud storage providers must implement this trait
#[async_trait]
pub trait CloudProvider: Send + Sync {
    /// Get the provider type
    fn provider_type(&self) -> CloudProviderType;

    /// Get the provider name
    fn provider_name(&self) -> &str {
        self.provider_type().display_name()
    }

    /// Get the backup folder path for this provider
    fn backup_folder(&self) -> &str;

    // ========== Authentication ==========

    /// Start OAuth authentication flow
    /// Returns the authorization URL to open in a browser
    async fn authenticate(&mut self) -> Result<String, AppError>;

    /// Handle OAuth callback
    /// Exchange the authorization code for tokens
    async fn handle_callback(&mut self, code: &str, state: &str) -> Result<AuthResult, AppError>;

    /// Refresh the access token using refresh token
    async fn refresh_token(&mut self) -> Result<(), AppError>;

    /// Get account information
    async fn get_account_info(&self) -> Result<AccountInfo, AppError>;

    /// Disconnect and clear credentials
    async fn disconnect(&mut self) -> Result<(), AppError>;

    /// Check if authenticated
    fn is_authenticated(&self) -> bool;

    // ========== File Operations ==========

    /// Upload a file to cloud storage
    async fn upload_file(
        &self,
        path: &str,
        data: Vec<u8>,
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<String, AppError>;

    /// Download a file from cloud storage
    async fn download_file(
        &self,
        path: &str,
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<Vec<u8>, AppError>;

    /// List files in a folder
    async fn list_files(&self, path: &str) -> Result<Vec<FileInfo>, AppError>;

    /// Delete a file
    async fn delete_file(&self, path: &str) -> Result<(), AppError>;

    /// Get file metadata
    async fn get_metadata(&self, path: &str) -> Result<FileMetadata, AppError>;

    /// Create a folder
    async fn create_folder(&self, path: &str) -> Result<String, AppError>;

    /// Check if a file/folder exists
    async fn exists(&self, path: &str) -> Result<bool, AppError>;
}

/// Backup options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupOptions {
    pub include_database: bool,
    pub include_documents: bool,
    pub include_settings: bool,
    pub compress: bool,
    pub encrypt: bool,
}

impl Default for BackupOptions {
    fn default() -> Self {
        Self {
            include_database: true,
            include_documents: true,
            include_settings: true,
            compress: true,
            encrypt: true,
        }
    }
}

/// Backup information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub device_id: String,
    pub app_version: String,
    pub backup_type: String,
    pub size: u64,
    pub file_count: usize,
    pub includes: BackupIncludes,
    pub encrypted: bool,
    pub compressed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupIncludes {
    pub database: bool,
    pub documents: bool,
    pub settings: bool,
}

/// Restore result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreResult {
    pub success: bool,
    pub restored_items: usize,
    pub conflicts: Vec<RestoreConflict>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreConflict {
    pub item_id: String,
    pub item_type: String,
    pub local_version: String,
    pub backup_version: String,
}

/// Sync mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SyncMode {
    Backup,   // One-way: local -> cloud
    TwoWay,   // Two-way: bidirectional sync
}

/// Sync result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub uploaded: usize,
    pub downloaded: usize,
    pub conflicts: Vec<SyncConflict>,
    pub error: Option<String>,
    pub duration_secs: u64,
}

/// Sync conflict
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    pub item_id: String,
    pub item_type: String,
    pub local_modified: DateTime<Utc>,
    pub remote_modified: DateTime<Utc>,
}

/// Conflict resolution strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ConflictResolution {
    KeepLocal,
    KeepRemote,
    KeepNewest,
    KeepBoth,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_type_from_str() {
        assert_eq!(CloudProviderType::from_str("onedrive"), Some(CloudProviderType::OneDrive));
        assert_eq!(CloudProviderType::from_str("google-drive"), Some(CloudProviderType::GoogleDrive));
        assert_eq!(CloudProviderType::from_str("dropbox"), Some(CloudProviderType::Dropbox));
        assert_eq!(CloudProviderType::from_str("invalid"), None);
    }

    #[test]
    fn test_storage_quota() {
        let quota = StorageQuota {
            used: 500,
            total: 1000,
        };

        assert_eq!(quota.available(), 500);
        assert_eq!(quota.used_percentage(), 50.0);
    }
}
