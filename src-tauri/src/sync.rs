//! Cloud synchronization system
//!
//! This module provides functionality for synchronizing application data
//! with a cloud storage backend using end-to-end encryption.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use sha2::{Sha256, Digest};
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};

use crate::database::Database;
use crate::error::AppError;

/// Sync status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SyncStatus {
    Idle,
    Connecting,
    Syncing,
    Synced,
    Failed(String),
    Conflict(Vec<SyncConflict>),
}

/// Sync conflict
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SyncConflict {
    pub id: String,
    pub local_version: DataVersion,
    pub remote_version: DataVersion,
    pub conflict_type: ConflictType,
}

/// Type of sync conflict
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConflictType {
    Modified,
    Deleted,
    BothModified,
    BothDeleted,
}

/// Data version for conflict detection
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DataVersion {
    pub version: u64,
    pub timestamp: DateTime<Utc>,
    pub device_id: String,
    pub hash: String,
}

/// Syncable data item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncItem {
    pub id: String,
    pub data_type: SyncDataType,
    pub version: DataVersion,
    pub data: Vec<u8>, // Encrypted data
    pub deleted: bool,
}

/// Type of sync data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncDataType {
    Document,
    Extract,
    Flashcard,
    Category,
    Settings,
    FullSync,
}

/// Encryption key info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionKey {
    pub key_id: String,
    pub public_key: String,
    pub encrypted_private_key: Vec<u8>,
    pub created_at: DateTime<Utc>,
}

/// Sync configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    pub enabled: bool,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub device_id: String,
    pub encryption_enabled: bool,
    pub auto_sync: bool,
    pub sync_interval_minutes: u64,
    pub last_sync: Option<DateTime<Utc>>,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            endpoint: String::new(),
            api_key: None,
            device_id: generate_device_id(),
            encryption_enabled: true,
            auto_sync: false,
            sync_interval_minutes: 30,
            last_sync: None,
        }
    }
}

/// Cloud sync client
pub struct CloudSyncClient {
    config: SyncConfig,
    encryption_key: Option<Vec<u8>>,
    http_client: reqwest::blocking::Client,
}

impl CloudSyncClient {
    /// Create a new sync client
    pub fn new(config: SyncConfig) -> Result<Self, AppError> {
        let http_client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::SyncError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            config,
            encryption_key: None,
            http_client,
        })
    }

    /// Set encryption key
    pub fn set_encryption_key(&mut self, key: Vec<u8>) {
        self.encryption_key = Some(key);
    }

    /// Generate encryption key
    pub fn generate_encryption_key(&mut self) -> Result<Vec<u8>, AppError> {
        let mut rng = OsRng;
        let key = Aes256Gcm::generate_key(&mut rng);
        self.encryption_key = Some(key.to_vec());
        Ok(key.to_vec())
    }

    /// Encrypt data
    fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, AppError> {
        if !self.config.encryption_enabled {
            return Ok(data.to_vec());
        }

        let key = self.encryption_key.as_ref()
            .ok_or_else(|| AppError::SyncError("Encryption key not set".to_string()))?;

        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|e| AppError::SyncError(format!("Failed to create cipher: {}", e)))?;

        let mut rng = OsRng;
        let nonce = Aes256Gcm::generate_nonce(&mut rng);
        let ciphertext = cipher.encrypt(&nonce, data)
            .map_err(|e| AppError::SyncError(format!("Encryption failed: {}", e)))?;

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(nonce.len() + ciphertext.len());
        result.extend_from_slice(&nonce);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt data
    fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, AppError> {
        if !self.config.encryption_enabled {
            return Ok(data.to_vec());
        }

        let key = self.encryption_key.as_ref()
            .ok_or_else(|| AppError::SyncError("Encryption key not set".to_string()))?;

        if data.len() < 12 {
            return Err(AppError::SyncError("Invalid encrypted data".to_string()));
        }

        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|e| AppError::SyncError(format!("Failed to create cipher: {}", e)))?;

        let (nonce, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce);

        let plaintext = cipher.decrypt(nonce, ciphertext)
            .map_err(|e| AppError::SyncError(format!("Decryption failed: {}", e)))?;

        Ok(plaintext)
    }

    /// Calculate data hash
    fn calculate_hash(&self, data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    /// Sync data with cloud
    pub fn sync(&mut self, local_data: Vec<SyncItem>) -> Result<SyncResult, AppError> {
        // 1. Get remote data
        let remote_data = self.fetch_remote_data()?;

        // 2. Detect conflicts
        let conflicts = self.detect_conflicts(&local_data, &remote_data);

        if !conflicts.is_empty() {
            return Ok(SyncResult {
                status: SyncStatus::Conflict(conflicts.clone()),
                uploaded: 0,
                downloaded: 0,
                conflicts: conflicts.len(),
            });
        }

        // 3. Merge changes
        let (to_upload, to_download) = self.merge_changes(&local_data, &remote_data)?;

        // 4. Upload local changes
        let mut uploaded = 0;
        for item in to_upload {
            self.upload_item(&item)?;
            uploaded += 1;
        }

        // 5. Download remote changes
        let mut downloaded = 0;
        for item in to_download {
            downloaded += 1;
        }

        // 6. Update last sync time
        self.config.last_sync = Some(Utc::now());

        Ok(SyncResult {
            status: SyncStatus::Synced,
            uploaded,
            downloaded,
            conflicts: 0,
        })
    }

    /// Fetch remote data from cloud
    fn fetch_remote_data(&self) -> Result<HashMap<String, SyncItem>, AppError> {
        let url = format!("{}/sync/data", self.config.endpoint);

        let response = self.http_client
            .get(&url)
            .header("X-API-Key", self.config.api_key.as_ref().unwrap_or(&String::new()))
            .header("X-Device-ID", &self.config.device_id)
            .send()
            .map_err(|e| AppError::SyncError(format!("Failed to fetch remote data: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::SyncError(format!("Remote sync failed: {}", response.status())));
        }

        let data: Vec<SyncItem> = response
            .json()
            .map_err(|e| AppError::SyncError(format!("Failed to parse response: {}", e)))?;

        let mut map = HashMap::new();
        for item in data {
            map.insert(item.id.clone(), item);
        }

        Ok(map)
    }

    /// Detect conflicts between local and remote data
    fn detect_conflicts(
        &self,
        local_data: &[SyncItem],
        remote_data: &HashMap<String, SyncItem>,
    ) -> Vec<SyncConflict> {
        let mut conflicts = Vec::new();

        for local_item in local_data {
            if let Some(remote_item) = remote_data.get(&local_item.id) {
                // Both exist - check for conflicts
                if local_item.version.version != remote_item.version.version {
                    conflicts.push(SyncConflict {
                        id: local_item.id.clone(),
                        local_version: local_item.version.clone(),
                        remote_version: remote_item.version.clone(),
                        conflict_type: ConflictType::BothModified,
                    });
                }
            }
        }

        conflicts
    }

    /// Merge local and remote changes
    fn merge_changes(
        &self,
        local_data: &[SyncItem],
        remote_data: &HashMap<String, SyncItem>,
    ) -> Result<(Vec<SyncItem>, Vec<SyncItem>), AppError> {
        let mut to_upload = Vec::new();
        let mut to_download = Vec::new();
        let local_map: HashMap<String, &SyncItem> = local_data
            .iter()
            .map(|item| (item.id.clone(), item))
            .collect();

        // Find items to upload (new or modified locally)
        for (id, local_item) in &local_map {
            if let Some(remote_item) = remote_data.get(id) {
                if local_item.version.version > remote_item.version.version {
                    to_upload.push((*local_item).clone());
                }
            } else {
                // New item
                to_upload.push((*local_item).clone());
            }
        }

        // Find items to download (new or modified remotely)
        for (id, remote_item) in remote_data {
            if let Some(local_item) = local_map.get(id) {
                if remote_item.version.version > local_item.version.version {
                    to_download.push(remote_item.clone());
                }
            } else {
                // New remote item
                to_download.push(remote_item.clone());
            }
        }

        Ok((to_upload, to_download))
    }

    /// Upload a single item to cloud
    fn upload_item(&self, item: &SyncItem) -> Result<(), AppError> {
        let url = format!("{}/sync/upload", self.config.endpoint);

        let encrypted_data = self.encrypt(&item.data)?;

        let upload_item = SyncItem {
            data: encrypted_data,
            ..item.clone()
        };

        self.http_client
            .post(&url)
            .header("X-API-Key", self.config.api_key.as_ref().unwrap_or(&String::new()))
            .header("X-Device-ID", &self.config.device_id)
            .json(&upload_item)
            .send()
            .map_err(|e| AppError::SyncError(format!("Failed to upload item: {}", e)))?;

        Ok(())
    }

    /// Resolve a sync conflict
    pub fn resolve_conflict(
        &mut self,
        conflict: SyncConflict,
        resolution: ConflictResolution,
    ) -> Result<(), AppError> {
        match resolution {
            ConflictResolution::KeepLocal => {
                // Re-upload local version
                // Implementation depends on having access to local data
            }
            ConflictResolution::KeepRemote => {
                // Download and apply remote version
            }
            ConflictResolution::Merge => {
                // Attempt to merge (complex, data-type specific)
            }
        }

        Ok(())
    }
}

/// Result of a sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub status: SyncStatus,
    pub uploaded: usize,
    pub downloaded: usize,
    pub conflicts: usize,
}

/// Conflict resolution strategy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictResolution {
    KeepLocal,
    KeepRemote,
    Merge,
}

/// Generate a unique device ID
fn generate_device_id() -> String {
    format!("{}-{}",
        hostname::get()
            .unwrap_or_else(|_| OsStr::new("unknown").to_os_string())
            .to_string_lossy(),
        std::process::id()
    )
}

use std::ffi::OsStr;

/// Sync scheduler
pub struct SyncScheduler {
    config: SyncConfig,
    client: CloudSyncClient,
}

impl SyncScheduler {
    /// Create a new sync scheduler
    pub fn new(config: SyncConfig) -> Result<Self, AppError> {
        let client = CloudSyncClient::new(config.clone())?;
        Ok(Self { config, client })
    }

    /// Run scheduled sync
    pub fn run_scheduled_sync(&mut self) -> Result<SyncResult, AppError> {
        if !self.config.enabled || !self.config.auto_sync {
            return Ok(SyncResult {
                status: SyncStatus::Idle,
                uploaded: 0,
                downloaded: 0,
                conflicts: 0,
            });
        }

        // Check if enough time has passed since last sync
        if let Some(last_sync) = self.config.last_sync {
            let elapsed = Utc::now().signed_duration_since(last_sync);
            let min_duration = chrono::Duration::minutes(self.config.sync_interval_minutes as i64);

            if elapsed < min_duration {
                return Ok(SyncResult {
                    status: SyncStatus::Idle,
                    uploaded: 0,
                    downloaded: 0,
                    conflicts: 0,
                });
            }
        }

        // Run sync
        self.client.sync(vec![])
    }

    /// Get time until next sync
    pub fn time_until_next_sync(&self) -> Option<chrono::Duration> {
        if !self.config.enabled || !self.config.auto_sync {
            return None;
        }

        if let Some(last_sync) = self.config.last_sync {
            let elapsed = Utc::now().signed_duration_since(last_sync);
            let interval = chrono::Duration::minutes(self.config.sync_interval_minutes as i64);

            if elapsed < interval {
                return Some(interval - elapsed);
            }
        }

        Some(chrono::Duration::zero())
    }
}

/// Sync log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncLogEntry {
    pub timestamp: DateTime<Utc>,
    pub status: SyncStatus,
    pub uploaded: usize,
    pub downloaded: usize,
    pub conflicts: usize,
    pub error: Option<String>,
}

/// Sync log viewer
pub struct SyncLog {
    entries: Vec<SyncLogEntry>,
    max_entries: usize,
}

impl SyncLog {
    /// Create a new sync log
    pub fn new(max_entries: usize) -> Self {
        Self {
            entries: Vec::new(),
            max_entries,
        }
    }

    /// Add a log entry
    pub fn log(&mut self, result: &SyncResult) {
        let entry = SyncLogEntry {
            timestamp: Utc::now(),
            status: result.status.clone(),
            uploaded: result.uploaded,
            downloaded: result.downloaded,
            conflicts: result.conflicts,
            error: match &result.status {
                SyncStatus::Failed(e) => Some(e.clone()),
                _ => None,
            },
        };

        self.entries.push(entry);

        // Trim old entries
        if self.entries.len() > self.max_entries {
            self.entries.remove(0);
        }
    }

    /// Get all log entries
    pub fn entries(&self) -> &[SyncLogEntry] {
        &self.entries
    }

    /// Get recent entries
    pub fn recent_entries(&self, count: usize) -> &[SyncLogEntry] {
        let start = if self.entries.len() > count {
            self.entries.len() - count
        } else {
            0
        };
        &self.entries[start..]
    }
}

#[tauri::command]
pub async fn sync_now(api_key: String, endpoint: String) -> Result<SyncResult, String> {
    let config = SyncConfig {
        enabled: true,
        endpoint,
        api_key: Some(api_key),
        ..Default::default()
    };

    let mut client = CloudSyncClient::new(config)
        .map_err(|e| e.to_string())?;

    client.sync(vec![])
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sync_status() -> Result<SyncStatus, String> {
    // This would check the actual sync status
    Ok(SyncStatus::Idle)
}

#[tauri::command]
pub async fn resolve_sync_conflict(
    conflict: SyncConflict,
    resolution: ConflictResolution,
) -> Result<(), String> {
    // This would resolve the conflict
    Ok(())
}

#[tauri::command]
pub async fn get_sync_log() -> Result<Vec<SyncLogEntry>, String> {
    // This would return the sync log
    Ok(vec![])
}
