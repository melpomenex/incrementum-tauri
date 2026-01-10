//! Google Drive Cloud Provider Implementation
//!
//! Implements OAuth 2.0 authentication and file operations for Google Drive
//! using Google Drive API v3.

use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use reqwest::{Client, header};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use url::Url;

use super::provider::{
    AccountInfo, AuthResult, AuthToken, CloudProvider, CloudProviderType,
    FileInfo, FileMetadata, StorageQuota,
};
use crate::error::AppError;

/// Google Drive OAuth configuration
pub struct GoogleDriveConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
}

impl Default for GoogleDriveConfig {
    fn default() -> Self {
        Self {
            // Google OAuth default scopes for Incrementum
            // Credentials can be set via environment variables:
            // INCREMENTUM_GOOGLE_DRIVE_CLIENT_ID and INCREMENTUM_GOOGLE_DRIVE_CLIENT_SECRET
            client_id: std::env::var("INCREMENTUM_GOOGLE_DRIVE_CLIENT_ID")
                .unwrap_or_else(|_| "YOUR_CLIENT_ID.apps.googleusercontent.com".to_string()),
            client_secret: std::env::var("INCREMENTUM_GOOGLE_DRIVE_CLIENT_SECRET")
                .unwrap_or_else(|_| "YOUR_CLIENT_SECRET".to_string()),
            redirect_uri: "http://localhost:15173/auth/callback".to_string(),
            scopes: vec![
                "https://www.googleapis.com/auth/drive.appdata".to_string(), // App folder access
                "https://www.googleapis.com/auth/drive.file".to_string(), // Files created by app
                "profile".to_string(), // Basic profile info
                "email".to_string(), // Email address
            ],
        }
    }
}

/// Google Drive provider implementation
pub struct GoogleDriveProvider {
    config: GoogleDriveConfig,
    http_client: Client,
    auth_token: Option<AuthToken>,
    account_info: Option<AccountInfo>,
    app_folder_id: Option<String>,
    // For OAuth state validation
    pending_state: Option<String>,
}

impl GoogleDriveProvider {
    /// Create a new Google Drive provider
    pub fn new(config: GoogleDriveConfig) -> Self {
        Self {
            config,
            http_client: Client::new(),
            auth_token: None,
            account_info: None,
            app_folder_id: None,
            pending_state: None,
        }
    }

    /// Get the Google Drive API base URL
    fn api_base_url(&self) -> &str {
        "https://www.googleapis.com/drive/v3"
    }

    /// Get the OAuth authorization URL
    fn get_auth_url(&mut self) -> Result<String, AppError> {
        // Validate credentials before attempting OAuth
        if self.config.client_id.contains("YOUR_CLIENT_ID") || self.config.client_id.is_empty() {
            return Err(AppError::Internal(
                "Google Drive OAuth is not configured. Please set the INCREMENTUM_GOOGLE_DRIVE_CLIENT_ID \
                 environment variable with your Google Cloud project OAuth client ID.\n\n\
                 To configure Google Drive:\n\
                 1. Go to https://console.cloud.google.com/apis/credentials\n\
                 2. Create a new OAuth 2.0 client ID\n\
                 3. Add http://localhost:15173/auth/callback as an authorized redirect URI\n\
                 4. Copy the client ID\n\
                 5. Set the INCREMENTUM_GOOGLE_DRIVE_CLIENT_ID environment variable".to_string()
            ));
        }

        if self.config.client_secret == "YOUR_CLIENT_SECRET" || self.config.client_secret.is_empty() {
            return Err(AppError::Internal(
                "Google Drive OAuth is not configured. Please set the INCREMENTUM_GOOGLE_DRIVE_CLIENT_SECRET \
                 environment variable with your Google Cloud project OAuth client secret.\n\n\
                 To configure Google Drive:\n\
                 1. Go to https://console.cloud.google.com/apis/credentials\n\
                 2. Select your OAuth 2.0 client ID\n\
                 3. Copy the client secret\n\
                 4. Set the INCREMENTUM_GOOGLE_DRIVE_CLIENT_SECRET environment variable".to_string()
            ));
        }

        let state = self.generate_state();
        self.pending_state = Some(state.clone());

        let mut url = Url::parse("https://accounts.google.com/o/oauth2/v2/auth")
            .map_err(|e| AppError::Internal(format!("Failed to parse auth URL: {}", e)))?;

        url.query_pairs_mut()
            .append_pair("client_id", &self.config.client_id)
            .append_pair("response_type", "code")
            .append_pair("redirect_uri", &self.config.redirect_uri)
            .append_pair("scope", &self.config.scopes.join(" "))
            .append_pair("state", &state)
            .append_pair("access_type", "offline")
            .append_pair("prompt", "consent");

        Ok(url.to_string())
    }

    /// Generate a random state parameter for OAuth
    fn generate_state(&self) -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        format!("googledrive_{}", timestamp)
    }

    /// Exchange authorization code for tokens
    async fn exchange_code_for_token(&self, code: &str) -> Result<TokenResponse, AppError> {
        let mut params = HashMap::new();
        params.insert("client_id", self.config.client_id.clone());
        params.insert("client_secret", self.config.client_secret.clone());
        params.insert("code", code.to_string());
        params.insert("redirect_uri", self.config.redirect_uri.clone());
        params.insert("grant_type", "authorization_code".to_string());

        let response = self.http_client
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Token request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Token exchange failed: {}", error_text)));
        }

        response
            .json::<TokenResponse>()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse token response: {}", e)))
    }

    /// Refresh the access token
    async fn refresh_access_token(&self, refresh_token: &str) -> Result<TokenResponse, AppError> {
        let mut params = HashMap::new();
        params.insert("client_id", self.config.client_id.clone());
        params.insert("client_secret", self.config.client_secret.clone());
        params.insert("refresh_token", refresh_token.to_string());
        params.insert("grant_type", "refresh_token".to_string());

        let response = self.http_client
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Token refresh failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Token refresh failed: {}", error_text)));
        }

        response
            .json::<TokenResponse>()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse refresh response: {}", e)))
    }

    /// Get authenticated request headers
    fn get_auth_headers(&self) -> Result<header::HeaderMap, AppError> {
        let token = self.auth_token
            .as_ref()
            .ok_or_else(|| AppError::Internal("Not authenticated".to_string()))?;

        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            format!("Bearer {}", token.access_token).parse().unwrap(),
        );
        headers.insert(header::CONTENT_TYPE, "application/json".parse().unwrap());

        Ok(headers)
    }

    /// Fetch account information from Google
    async fn fetch_account_info(&self) -> Result<AccountInfo, AppError> {
        let headers = self.get_auth_headers()?;

        // Get user info
        let response = self.http_client
            .get("https://www.googleapis.com/oauth2/v2/userinfo")
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to fetch account info: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Account info request failed: {}", error_text)));
        }

        let user_info: UserInfo = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse user info: {}", e)))?;

        // Get storage quota from Google Drive
        let quota_response = self.http_client
            .get(&format!("{}/about", self.api_base_url()))
            .query(&[("fields", "storageQuota")])
            .headers(self.get_auth_headers()?)
            .send()
            .await;

        let storage_quota = match quota_response {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(about) = resp.json::<About>().await {
                    if let Some(limit) = about.storage_quota.limit {
                        let usage = about.storage_quota.usage.unwrap_or(0);
                        let total = limit.parse().unwrap_or(0);
                        Some(StorageQuota {
                            used: usage,
                            total,
                        })
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
            _ => None,
        };

        Ok(AccountInfo {
            account_id: user_info.id,
            account_name: user_info.name,
            email: Some(user_info.email),
            storage_quota,
        })
    }

    /// Get or create the Incrementum app folder
    async fn get_app_folder_id(&mut self) -> Result<String, AppError> {
        if let Some(folder_id) = &self.app_folder_id {
            return Ok(folder_id.clone());
        }

        let headers = self.get_auth_headers()?;

        // Try to find existing Incrementum folder
        let response = self.http_client
            .get(&format!("{}/files", self.api_base_url()))
            .query(&[
                ("q", "name='Incrementum' and mimeType='application/vnd.google-apps.folder' and trashed=false"),
                ("spaces", "appDataFolder"),
                ("fields", "files(id,name)"),
            ])
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to search for app folder: {}", e)))?;

        if response.status().is_success() {
            if let Ok(search_response) = response.json::<FileList>().await {
                if let Some(folder) = search_response.files.first() {
                    self.app_folder_id = Some(folder.id.clone());
                    return Ok(folder.id.clone());
                }
            }
        }

        // Create the folder if it doesn't exist
        let headers = self.get_auth_headers()?;
        let create_body = serde_json::json!({
            "name": "Incrementum",
            "mimeType": "application/vnd.google-apps.folder",
            "parents": ["appDataFolder"]
        });

        let response = self.http_client
            .post(&format!("{}/files", self.api_base_url()))
            .query(&[("fields", "id")])
            .headers(headers)
            .json(&create_body)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to create app folder: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Failed to create app folder: {}", error_text)));
        }

        let folder: DriveFile = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse folder response: {}", e)))?;

        self.app_folder_id = Some(folder.id.clone());
        Ok(folder.id)
    }

    /// Get the Incrementum app folder path
    async fn get_app_folder(&mut self) -> Result<String, AppError> {
        let folder_id = self.get_app_folder_id().await?;
        Ok(folder_id)
    }
}

#[async_trait]
impl CloudProvider for GoogleDriveProvider {
    fn provider_type(&self) -> CloudProviderType {
        CloudProviderType::GoogleDrive
    }

    fn backup_folder(&self) -> &str {
        "Incrementum"
    }

    async fn authenticate(&mut self) -> Result<String, AppError> {
        let auth_url = self.get_auth_url()?;
        Ok(auth_url)
    }

    async fn handle_callback(&mut self, code: &str, state: &str) -> Result<AuthResult, AppError> {
        // Validate state parameter
        if let Some(expected_state) = &self.pending_state {
            if state != expected_state {
                return Ok(AuthResult {
                    success: false,
                    account_info: None,
                    error: Some("Invalid state parameter".to_string()),
                });
            }
        }

        // Exchange code for tokens
        let token_response = self.exchange_code_for_token(code).await?;

        // Calculate token expiration
        let expires_at = Utc::now() + Duration::seconds(token_response.expires_in as i64);

        // Store auth token
        self.auth_token = Some(AuthToken {
            access_token: token_response.access_token.clone(),
            refresh_token: token_response.refresh_token.clone(),
            expires_at,
            token_type: token_response.token_type,
        });

        // Fetch account info
        let account_info = self.fetch_account_info().await?;
        self.account_info = Some(account_info.clone());

        // Clear pending state
        self.pending_state = None;

        Ok(AuthResult {
            success: true,
            account_info: Some(account_info),
            error: None,
        })
    }

    async fn refresh_token(&mut self) -> Result<(), AppError> {
        let refresh_token = self
            .auth_token
            .as_ref()
            .ok_or_else(|| AppError::Internal("No refresh token available".to_string()))?
            .refresh_token
            .clone();

        let token_response = self.refresh_access_token(&refresh_token).await?;

        let expires_at = Utc::now() + Duration::seconds(token_response.expires_in as i64);

        self.auth_token = Some(AuthToken {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            expires_at,
            token_type: token_response.token_type,
        });

        Ok(())
    }

    async fn get_account_info(&self) -> Result<AccountInfo, AppError> {
        self.account_info
            .as_ref()
            .cloned()
            .ok_or_else(|| AppError::Internal("Not authenticated".to_string()))
    }

    async fn disconnect(&mut self) -> Result<(), AppError> {
        self.auth_token = None;
        self.account_info = None;
        self.app_folder_id = None;
        self.pending_state = None;
        Ok(())
    }

    fn is_authenticated(&self) -> bool {
        self.auth_token.is_some()
    }

    async fn upload_file(
        &self,
        path: &str,
        data: Vec<u8>,
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<String, AppError> {
        let headers = self.get_auth_headers()?;

        let file_name = if path.contains('/') {
            path.rsplit('/').last().unwrap_or(path)
        } else {
            path
        };

        // For small files (<5MB), use simple upload
        let data_len = data.len();
        if data_len < 5 * 1024 * 1024 {
            if let Some(p) = &progress {
                p(0, data_len as u64);
            }

            let upload_request = self.http_client
                .post(&format!(
                    "{}/upload/drive/v3/files?uploadType=multipart&fields=id",
                    self.api_base_url().replace("/v3", "")
                ))
                .headers(headers)
                .multipart(
                    reqwest::multipart::Form::new()
                        .part("metadata", reqwest::multipart::Part::text(serde_json::json!({
                            "name": file_name,
                            "parents": [self.app_folder_id.as_ref().unwrap_or(&"appDataFolder".to_string())],
                        }).to_string()))
                        .part("file", reqwest::multipart::Part::bytes(data))
                );

            let response = upload_request
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("Upload failed: {}", e)))?;

            if let Some(p) = &progress {
                p(data_len as u64, data_len as u64);
            }

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Upload failed: {}", error_text)));
            }

            let result: DriveFile = response
                .json()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to parse upload response: {}", e)))?;

            Ok(result.id)
        } else {
            // For large files, use resumable upload
            self.upload_file_resumable(file_name, &data, progress).await
        }
    }

    async fn download_file(
        &self,
        path: &str,
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<Vec<u8>, AppError> {
        let file_id = self.resolve_file_id(path).await?;

        let headers = self.get_auth_headers()?;

        // Get download URL
        let response = self.http_client
            .get(&format!("{}/files/{}?fields=webContentLink", self.api_base_url(), file_id))
            .headers(headers.clone())
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Download failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Download failed: {}", error_text)));
        }

        let file_info: DriveFile = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse file info: {}", e)))?;

        let download_url = file_info.web_content_link
            .ok_or_else(|| AppError::Internal("No download URL available".to_string()))?;

        // Download file content
        let data = self.http_client
            .get(&download_url)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to download file: {}", e)))?
            .bytes()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to read file content: {}", e)))?
            .to_vec();

        if let Some(p) = &progress {
            p(data.len() as u64, data.len() as u64);
        }

        Ok(data)
    }

    async fn list_files(&self, path: &str) -> Result<Vec<FileInfo>, AppError> {
        let folder_id = if path.is_empty() || path == "/" {
            self.app_folder_id.clone().unwrap_or_else(|| "appDataFolder".to_string())
        } else {
            self.resolve_file_id(path).await?
        };

        let headers = self.get_auth_headers()?;

        let query = format!(
            "'{}' in parents and trashed=false",
            folder_id
        );

        let response = self.http_client
            .get(&format!("{}/files", self.api_base_url()))
            .query(&[
                ("q", &query),
                ("fields", &String::from("files(id,name,size,modifiedTime,mimeType,kind)")),
                ("pageSize", &String::from("1000")),
            ])
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("List files failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("List files failed: {}", error_text)));
        }

        let file_list: FileList = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse list response: {}", e)))?;

        let files = file_list
            .files
            .into_iter()
            .map(|file| FileInfo {
                id: file.id.clone(),
                name: file.name.clone(),
                path: format!("{}/{}", path.trim_start_matches('/'), file.name),
                size: file.size.unwrap_or(0),
                modified_time: file.modified_time.unwrap_or_else(|| Utc::now()),
                is_folder: file.mime_type.as_deref() == Some("application/vnd.google-apps.folder"),
                mime_type: file.mime_type,
            })
            .collect();

        Ok(files)
    }

    async fn delete_file(&self, path: &str) -> Result<(), AppError> {
        let file_id = self.resolve_file_id(path).await?;

        let headers = self.get_auth_headers()?;

        let response = self.http_client
            .delete(&format!("{}/files/{}", self.api_base_url(), file_id))
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Delete failed: {}", e)))?;

        if !response.status().is_success() && response.status() != 404 {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Delete failed: {}", error_text)));
        }

        Ok(())
    }

    async fn get_metadata(&self, path: &str) -> Result<FileMetadata, AppError> {
        let file_id = self.resolve_file_id(path).await?;

        let headers = self.get_auth_headers()?;

        let response = self.http_client
            .get(&format!(
                "{}/files/{}?fields=id,name,size,createdTime,modifiedTime,md5Checksum",
                self.api_base_url(),
                file_id
            ))
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Get metadata failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Get metadata failed: {}", error_text)));
        }

        let file: DriveFile = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse metadata response: {}", e)))?;

        Ok(FileMetadata {
            id: file.id,
            name: file.name,
            size: file.size.unwrap_or(0),
            created_time: file.created_time,
            modified_time: file.modified_time.unwrap_or_else(|| Utc::now()),
            checksum: file.md5_checksum,
        })
    }

    async fn create_folder(&self, path: &str) -> Result<String, AppError> {
        let headers = self.get_auth_headers()?;

        let folder_name = if path.contains('/') {
            path.rsplit('/').last().unwrap_or(path)
        } else {
            path
        };

        let create_body = serde_json::json!({
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [self.app_folder_id.as_ref().unwrap_or(&"appDataFolder".to_string())]
        });

        let response = self.http_client
            .post(&format!("{}/files?fields=id", self.api_base_url()))
            .headers(headers)
            .json(&create_body)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Create folder failed: {}", e)))?;

        if !response.status().is_success() && response.status() != 409 {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Create folder failed: {}", error_text)));
        }

        let folder: DriveFile = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse folder response: {}", e)))?;

        Ok(folder_name.to_string())
    }

    async fn exists(&self, path: &str) -> Result<bool, AppError> {
        match self.resolve_file_id(path).await {
            Ok(_) => Ok(true),
            Err(e) if e.to_string().contains("not found") => Ok(false),
            Err(e) => Err(e),
        }
    }
}

impl GoogleDriveProvider {
    /// Upload a large file using resumable upload
    async fn upload_file_resumable(
        &self,
        file_name: &str,
        data: &[u8],
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<String, AppError> {
        // Initiate resumable upload session
        let headers = self.get_auth_headers()?;
        let metadata = serde_json::json!({
            "name": file_name,
            "parents": [self.app_folder_id.as_ref().unwrap_or(&"appDataFolder".to_string())]
        });

        let init_response = self.http_client
            .post(&format!(
                "{}/upload/drive/v3/files?uploadType=resumable&fields=id",
                self.api_base_url().replace("/v3", "")
            ))
            .header("X-Upload-Content-Length", data.len())
            .header("X-Upload-Content-Type", "application/octet-stream")
            .headers(headers)
            .json(&metadata)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Upload session creation failed: {}", e)))?;

        if !init_response.status().is_success() {
            let error_text = init_response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Upload session creation failed: {}", error_text)));
        }

        let upload_url = init_response
            .headers()
            .get("location")
            .ok_or_else(|| AppError::Internal("No upload URL in response".to_string()))?
            .to_str()
            .map_err(|_| AppError::Internal("Invalid upload URL".to_string()))?
            .to_string();

        // Upload the file
        let chunk_size = 256 * 1024; // 256KB chunks
        let total_size = data.len() as u64;
        let mut uploaded = 0u64;

        while uploaded < total_size {
            let chunk_end = std::cmp::min(uploaded + chunk_size as u64, total_size);
            let chunk = &data[uploaded as usize..chunk_end as usize];

            let content_range = format!("bytes {}-{}/{}", uploaded, chunk_end - 1, total_size);

            let chunk_response = self.http_client
                .put(&upload_url)
                .header("Content-Length", chunk.len())
                .header("Content-Range", content_range)
                .body(chunk.to_vec())
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("Chunk upload failed: {}", e)))?;

            if !chunk_response.status().is_success() && chunk_response.status() != 308 {
                let error_text = chunk_response.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Chunk upload failed: {}", error_text)));
            }

            uploaded = chunk_end;

            if let Some(p) = &progress {
                p(uploaded, total_size);
            }
        }

        // Get the final file info
        let final_response = self.http_client
            .get(&upload_url)
            .headers(self.get_auth_headers()?)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to get upload result: {}", e)))?;

        if !final_response.status().is_success() {
            let error_text = final_response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Failed to get upload result: {}", error_text)));
        }

        let result: DriveFile = final_response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse upload result: {}", e)))?;

        Ok(result.id)
    }

    /// Resolve a file path to a file ID
    async fn resolve_file_id(&self, path: &str) -> Result<String, AppError> {
        let root_id = self
            .app_folder_id
            .clone()
            .unwrap_or_else(|| "appDataFolder".to_string());

        if path == "/" || path.is_empty() {
            return Ok(root_id);
        }

        let mut parent_folder = root_id;
        let parts = path.split('/').filter(|p| !p.is_empty());

        for part in parts {
            let query = format!(
                "name='{}' and '{}' in parents and trashed=false",
                part.replace('\\', "\\\\").replace('\'', "\\'"),
                parent_folder
            );

            let response = self.http_client
                .get(&format!("{}/files", self.api_base_url()))
                .query(&[("q", &query), ("fields", &String::from("files(id)"))])
                .headers(self.get_auth_headers()?)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to resolve file ID: {}", e)))?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Failed to resolve file ID: {}", error_text)));
            }

            let file_list: FileList = response
                .json()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to parse search response: {}", e)))?;

            let file_id = file_list
                .files
                .first()
                .map(|f| f.id.clone())
                .ok_or_else(|| AppError::Internal(format!("File not found: {}", path)))?;

            parent_folder = file_id;
        }

        Ok(parent_folder)
    }
}

// ============ API Response Types ============

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
    token_type: String,
}

#[derive(Debug, Deserialize)]
struct UserInfo {
    id: String,
    name: String,
    email: String,
    #[serde(rename = "verified_email")]
    verified_email: bool,
}

#[derive(Debug, Deserialize)]
struct About {
    #[serde(rename = "storageQuota")]
    storage_quota: StorageQuotaInfo,
}

#[derive(Debug, Deserialize)]
struct StorageQuotaInfo {
    limit: Option<String>,
    usage: Option<u64>,
    #[serde(rename = "usageInDrive")]
    usage_in_drive: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct DriveFile {
    id: String,
    name: String,
    size: Option<u64>,
    #[serde(rename = "createdTime")]
    created_time: Option<DateTime<Utc>>,
    #[serde(rename = "modifiedTime")]
    modified_time: Option<DateTime<Utc>>,
    #[serde(rename = "mimeType")]
    mime_type: Option<String>,
    #[serde(rename = "md5Checksum")]
    md5_checksum: Option<String>,
    #[serde(rename = "webContentLink")]
    web_content_link: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FileList {
    files: Vec<DriveFile>,
}
