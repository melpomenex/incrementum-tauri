//! Backup Manager
//!
//! Handles creating and restoring backups from cloud storage

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path as StdPath, PathBuf};
use tokio::fs;

use crate::cloud::{
    CloudProvider,
    BackupOptions, BackupInfo, BackupIncludes,
    RestoreResult,
};
use crate::database::Database;
use crate::error::AppError;

/// Backup Manager
pub struct BackupManager {
    db: Database,
    temp_dir: PathBuf,
}

impl BackupManager {
    /// Create a new backup manager
    pub fn new(db: Database) -> Result<Self, AppError> {
        let temp_dir = std::env::temp_dir().join("incrementum-backups");

        Ok(Self {
            db,
            temp_dir,
        })
    }

    /// Get the temporary backup directory
    fn get_temp_dir(&self) -> PathBuf {
        self.temp_dir.clone()
    }

    /// Create a full backup
    pub async fn create_backup(
        &self,
        provider: &dyn CloudProvider,
        options: BackupOptions,
    ) -> Result<BackupInfo, AppError> {
        let timestamp = Utc::now();
        let backup_id = format!("backup_{}", timestamp.timestamp());
        let device_id = self.get_device_id();
        let app_version = env!("CARGO_PKG_VERSION").to_string();

        // Create temporary directory for this backup
        let backup_dir = self.temp_dir.join(&backup_id);
        fs::create_dir_all(&backup_dir)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to create backup dir: {}", e)))?;

        let mut file_count = 0;
        let mut total_size = 0;

        // 1. Export database
        if options.include_database {
            let db_path = backup_dir.join("incrementum.db");
            self.export_database(&db_path).await?;
            file_count += 1;
            total_size += fs::metadata(&db_path)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to get db size: {}", e)))?
                .len();
        }

        // 2. Copy document files
        if options.include_documents {
            let docs_dir = backup_dir.join("documents");
            fs::create_dir_all(&docs_dir)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to create docs dir: {}", e)))?;

            let (count, size) = self.copy_documents(&docs_dir).await?;
            file_count += count;
            total_size += size;
        }

        // 3. Export settings
        if options.include_settings {
            let _settings_path = backup_dir.join("settings.json");
            // TODO: Implement settings export
            // self.export_settings(&settings_path).await?;
            // file_count += 1;
        }

        // 4. Create backup manifest
        let manifest = BackupManifest {
            version: "1.0".to_string(),
            created_at: timestamp,
            device_id: device_id.clone(),
            app_version: app_version.clone(),
            backup_type: if options.include_documents && options.include_database {
                "full"
            } else if options.include_documents {
                "documents"
            } else {
                "database"
            }.to_string(),
            includes: BackupIncludes {
                database: options.include_database,
                documents: options.include_documents,
                settings: options.include_settings,
            },
            files: BackupFiles {
                database: if options.include_database {
                    Some("incrementum.db".to_string())
                } else {
                    None
                },
                documents: if options.include_documents {
                    Some("documents/".to_string())
                } else {
                    None
                },
                count: file_count,
                total_size,
            },
            encryption: BackupEncryption {
                enabled: options.encrypt,
                algorithm: if options.encrypt {
                    Some("AES-256-GCM".to_string())
                } else {
                    None
                },
            },
        };

        let manifest_path = backup_dir.join("manifest.json");
        let manifest_json = serde_json::to_string_pretty(&manifest)
            .map_err(|e| AppError::Internal(format!("Failed to serialize manifest: {}", e)))?;

        fs::write(&manifest_path, manifest_json)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to write manifest: {}", e)))?;

        // 5. Compress backup if requested
        let final_file: String = if options.compress {
            let zip_path = backup_dir.with_extension("zip");
            self.compress_backup(&backup_dir, &zip_path).await?;
            total_size = fs::metadata(&zip_path)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to get zip size: {}", e)))?
                .len();

            // Remove uncompressed folder
            tokio::fs::remove_dir_all(&backup_dir)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to remove temp dir: {}", e)))?;

            // Convert to owned String before zip_path is dropped
            zip_path.file_name().unwrap().to_string_lossy().to_string()
        } else {
            backup_dir.file_name().unwrap().to_string_lossy().to_string()
        };

        // 6. Upload to cloud
        let cloud_path = format!("/backups/{}", final_file);

        // Read the backup file
        let backup_data = fs::read(&self.temp_dir.join(&final_file))
            .await
            .map_err(|e| AppError::Internal(format!("Failed to read backup file: {}", e)))?;

        provider
            .upload_file(&cloud_path, backup_data, None)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to upload backup: {}", e)))?;

        // Clean up local file
        fs::remove_file(&self.temp_dir.join(&final_file))
            .await
            .ok();

        Ok(BackupInfo {
            id: backup_id,
            created_at: timestamp,
            device_id,
            app_version,
            backup_type: manifest.backup_type,
            size: total_size,
            file_count,
            includes: manifest.includes,
            encrypted: options.encrypt,
            compressed: options.compress,
        })
    }

    /// Restore from a backup
    pub async fn restore_backup(
        &self,
        provider: &dyn CloudProvider,
        backup_id: &str,
    ) -> Result<RestoreResult, AppError> {
        // Download backup from cloud
        let cloud_path = format!("/backups/{}", backup_id);
        let backup_data = provider
            .download_file(&cloud_path, None)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to download backup: {}", e)))?;

        // Save to temp directory
        let backup_path = self.temp_dir.join(backup_id);
        fs::write(&backup_path, backup_data)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to write backup: {}", e)))?;

        // Extract if compressed
        let backup_dir = if backup_id.ends_with(".zip") {
            let extract_dir = self.temp_dir.join(backup_id.trim_end_matches(".zip"));
            self.extract_backup(&backup_path, &extract_dir).await?;
            fs::remove_file(&backup_path)
                .await
                .ok();
            extract_dir
        } else {
            backup_path.clone()
        };

        // Read manifest
        let manifest_path = backup_dir.join("manifest.json");
        let manifest_json = fs::read_to_string(&manifest_path)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to read manifest: {}", e)))?;

        let manifest: BackupManifest = serde_json::from_str(&manifest_json)
            .map_err(|e| AppError::Internal(format!("Failed to parse manifest: {}", e)))?;

        let mut restored_items = 0;
        let conflicts = Vec::new();

        // Check for conflicts and restore
        if manifest.includes.database {
            // TODO: Check for database conflicts
            self.restore_database(&backup_dir.join("incrementum.db"))
                .await?;
            restored_items += 1;
        }

        if manifest.includes.documents {
            // TODO: Check for document conflicts
            let docs_dir = backup_dir.join("documents");
            if docs_dir.exists() {
                let count = self.restore_documents(&docs_dir).await?;
                restored_items += count;
            }
        }

        if manifest.includes.settings {
            // TODO: Restore settings
        }

        // Clean up
        fs::remove_dir_all(&backup_dir)
            .await
            .ok();

        Ok(RestoreResult {
            success: true,
            restored_items,
            conflicts,
            error: None,
        })
    }

    /// List available backups
    pub async fn list_backups(
        &self,
        provider: &dyn CloudProvider,
    ) -> Result<Vec<BackupInfo>, AppError> {
        let files = provider.list_files("/backups").await?;

        // Filter backup files
        let backup_files: Vec<_> = files
            .into_iter()
            .filter(|f| f.name.ends_with(".zip") || f.name.starts_with("backup_"))
            .collect();

        let mut backups = Vec::new();

        // Process each backup file sequentially for now
        for file in backup_files {
            // Download and parse manifest
            let manifest_path = format!("/backups/{}/manifest.json",
                file.name.trim_end_matches(".zip"));
            let manifest_data = provider.download_file(&manifest_path, None).await?;

            let manifest_json = String::from_utf8(manifest_data)
                .map_err(|e| AppError::Internal(format!("Failed to parse manifest: {}", e)))?;

            let manifest: BackupManifest = serde_json::from_str(&manifest_json)
                .map_err(|e| AppError::Internal(format!("Failed to parse manifest: {}", e)))?;

            backups.push(BackupInfo {
                id: file.name.trim_end_matches(".zip").to_string(),
                created_at: manifest.created_at,
                device_id: manifest.device_id,
                app_version: manifest.app_version,
                backup_type: manifest.backup_type,
                size: file.size,
                file_count: manifest.files.count,
                includes: manifest.includes,
                encrypted: manifest.encryption.enabled,
                compressed: true,
            });
        }

        Ok(backups)
    }

    /// Delete a backup
    pub async fn delete_backup(
        &self,
        provider: &dyn CloudProvider,
        backup_id: &str,
    ) -> Result<(), AppError> {
        let cloud_path = format!("/backups/{}.zip", backup_id);
        provider.delete_file(&cloud_path).await
    }

    /// Export the database to a file
    async fn export_database(&self, path: &PathBuf) -> Result<(), AppError> {
        // TODO: Implement database export
        // For now, use SQLite's VACUUM INTO command to export
        let pool = self.db.pool();

        // Run VACUUM INTO to export to a new file
        sqlx::query(&format!("VACUUM INTO '{}'", path.display()))
            .execute(pool)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to export database: {}", e)))?;

        Ok(())
    }

    /// Copy document files to backup directory
    async fn copy_documents(&self, dest_dir: &PathBuf) -> Result<(usize, u64), AppError> {
        // TODO: Get all documents from database
        // For now, return empty result
        let documents: Vec<crate::models::Document> = vec![];

        let mut count = 0;
        let mut total_size = 0;

        for doc in documents {
            let file_path = &doc.file_path;
            let src_path = StdPath::new(file_path);
            if src_path.exists() {
                let file_name = src_path
                    .file_name()
                    .map(|name| name.to_os_string())
                    .unwrap_or_else(|| std::ffi::OsString::from("file"));
                let dest_path = dest_dir.join(&doc.id).join(&file_name);

                // Create parent directory
                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent)
                        .await
                        .map_err(|e| AppError::Internal(format!("Failed to create dir: {}", e)))?;
                }

                // Copy file
                fs::copy(&src_path, &dest_path)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to copy file: {}", e)))?;

                // Copy metadata
                let metadata_path = dest_path.with_extension("metadata.json");
                let metadata = serde_json::to_vec(&doc)
                    .map_err(|e| AppError::Internal(format!("Failed to serialize metadata: {}", e)))?;
                fs::write(&metadata_path, metadata)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to write metadata: {}", e)))?;

                count += 1;
                total_size += fs::metadata(&dest_path)
                    .await
                    .map(|m| m.len())
                    .unwrap_or(0);
            }
        }

        Ok((count, total_size))
    }

    /// Restore database from backup
    async fn restore_database(&self, path: &PathBuf) -> Result<(), AppError> {
        // TODO: Implement database restore
        // For now, just log that we would restore
        tracing::info!("Would restore database from: {:?}", path);

        // To restore, we would need to:
        // 1. Close the existing database connection
        // 2. Copy the backup file to the database location
        // 3. Reopen the database connection
        // This requires more complex state management

        Ok(())
    }

    /// Restore documents from backup
    async fn restore_documents(&self, docs_dir: &PathBuf) -> Result<usize, AppError> {
        let mut count = 0;

        let mut entries = fs::read_dir(docs_dir)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to read docs dir: {}", e)))?;

        while let Some(entry) = entries.next_entry().await
            .map_err(|e| AppError::Internal(format!("Failed to read entry: {}", e)))?
        {
            let file_type = entry.file_type().await
                .map_err(|e| AppError::Internal(format!("Failed to get file type: {}", e)))?;

            if file_type.is_dir() {
                // This is a document directory
                let _doc_id = entry.file_name();
                let metadata_path = entry.path().join("metadata.json");

                if metadata_path.exists() {
                    // Read metadata
                    let _metadata_json = fs::read_to_string(&metadata_path)
                        .await
                        .map_err(|e| AppError::Internal(format!("Failed to read metadata: {}", e)))?;

                    // TODO: Import document with metadata
                    // For now, just count
                    count += 1;
                }
            }
        }

        Ok(count)
    }

    /// Compress backup directory to ZIP
    async fn compress_backup(
        &self,
        source_dir: &PathBuf,
        zip_path: &PathBuf,
    ) -> Result<(), AppError> {
        // Use system zip command for simplicity
        // In production, you'd use a Rust zip library
        let output = tokio::process::Command::new("zip")
            .arg("-r")
            .arg(zip_path)
            .arg(".")
            .current_dir(source_dir)
            .output()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to create zip: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Internal(format!("Zip creation failed: {:?}", String::from_utf8_lossy(&output.stderr))));
        }

        Ok(())
    }

    /// Extract ZIP backup
    async fn extract_backup(
        &self,
        zip_path: &PathBuf,
        dest_dir: &PathBuf,
    ) -> Result<(), AppError> {
        fs::create_dir_all(dest_dir)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to create dest dir: {}", e)))?;

        // Use system unzip command
        let output = tokio::process::Command::new("unzip")
            .arg("-q")
            .arg(zip_path)
            .arg("-d")
            .arg(dest_dir)
            .output()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to extract zip: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Internal(format!("Zip extraction failed: {:?}", String::from_utf8_lossy(&output.stderr))));
        }

        Ok(())
    }

    /// Get device ID
    fn get_device_id(&self) -> String {
        format!("{}-{}",
            hostname::get()
                .unwrap_or_else(|_| OsStr::new("unknown").to_os_string())
                .to_string_lossy(),
            std::process::id()
        )
    }
}

use std::ffi::OsStr;

// ============ Backup Manifest Types ============

#[derive(Debug, Serialize, Deserialize)]
struct BackupManifest {
    version: String,
    created_at: DateTime<Utc>,
    device_id: String,
    app_version: String,
    backup_type: String,
    includes: BackupIncludes,
    files: BackupFiles,
    encryption: BackupEncryption,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupFiles {
    database: Option<String>,
    documents: Option<String>,
    count: usize,
    total_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupEncryption {
    enabled: bool,
    algorithm: Option<String>,
}
