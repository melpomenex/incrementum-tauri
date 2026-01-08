//! OneDrive Cloud Provider Implementation
//!
//! Implements OAuth 2.0 authentication and file operations for OneDrive
//! using Microsoft Graph API.

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

/// OneDrive OAuth configuration
pub struct OneDriveConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
}

impl Default for OneDriveConfig {
    fn default() -> Self {
        Self {
            // Microsoft Graph API default scopes for Incrementum
            client_id: "YOUR_CLIENT_ID".to_string(), // Replace with actual client ID
            client_secret: "YOUR_CLIENT_SECRET".to_string(), // Replace with actual client secret
            redirect_uri: "http://localhost:15173/auth/callback".to_string(),
            scopes: vec![
                "User.Read".to_string(),
                "Files.ReadWrite.AppFolder".to_string(),
                "offline_access".to_string(),
            ],
        }
    }
}

/// OneDrive provider implementation
pub struct OneDriveProvider {
    config: OneDriveConfig,
    http_client: Client,
    auth_token: Option<AuthToken>,
    account_info: Option<AccountInfo>,
    // For OAuth state validation
    pending_state: Option<String>,
}

impl OneDriveProvider {
    /// Create a new OneDrive provider
    pub fn new(config: OneDriveConfig) -> Self {
        Self {
            config,
            http_client: Client::new(),
            auth_token: None,
            account_info: None,
            pending_state: None,
        }
    }

    /// Get the Microsoft Graph API base URL
    fn api_base_url(&self) -> &str {
        "https://graph.microsoft.com/v1.0/me/drive"
    }

    /// Get the OAuth authorization URL
    fn get_auth_url(&mut self) -> Result<String, AppError> {
        let state = self.generate_state();
        self.pending_state = Some(state.clone());

        let mut url = Url::parse("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
            .map_err(|e| AppError::Internal(format!("Failed to parse auth URL: {}", e)))?;

        url.query_pairs_mut()
            .append_pair("client_id", &self.config.client_id)
            .append_pair("response_type", "code")
            .append_pair("redirect_uri", &self.config.redirect_uri)
            .append_pair("scope", &self.config.scopes.join(" "))
            .append_pair("state", &state)
            .append_pair("response_mode", "query");

        Ok(url.to_string())
    }

    /// Generate a random state parameter for OAuth
    fn generate_state(&self) -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        format!("onedrive_{}", timestamp)
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
            .post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
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
            .post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
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

    /// Fetch account information from Microsoft Graph API
    async fn fetch_account_info(&self) -> Result<AccountInfo, AppError> {
        let headers = self.get_auth_headers()?;

        let response = self.http_client
            .get("https://graph.microsoft.com/v1.0/me")
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

        // Fetch storage quota
        let quota_response = self.http_client
            .get(&format!("{}/root/special/appfolder", self.api_base_url()))
            .headers(self.get_auth_headers()?)
            .send()
            .await;

        let storage_quota = match quota_response {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(folder) = resp.json::<DriveItem>().await {
                    Some(StorageQuota {
                        used: 0, // OneDrive doesn't provide per-folder quota
                        total: 0,
                    })
                } else {
                    None
                }
            }
            _ => None,
        };

        Ok(AccountInfo {
            account_id: user_info.id,
            account_name: user_info.display_name,
            email: user_info.mail,
            storage_quota,
        })
    }

    /// Get the Incrementum app folder path
    fn get_app_folder_path(&self) -> String {
        "/special/appfolder:/Incrementum:/children".to_string()
    }

    /// Ensure the Incrementum app folder exists
    async fn ensure_app_folder(&self) -> Result<String, AppError> {
        let headers = self.get_auth_headers()?;

        // Try to create the Incrementum folder in app folder
        let create_folder_body = serde_json::json!({
            "name": "Incrementum",
            "folder": {},
            "@microsoft.graph.conflictBehavior": "rename"
        });

        let response = self.http_client
            .post(&format!("{}/root/children", self.api_base_url()))
            .headers(headers)
            .json(&create_folder_body)
            .send()
            .await;

        match response {
            Ok(resp) if resp.status().is_success() || resp.status() == 409 => {
                // 409 means folder already exists, which is fine
                Ok("Incrementum".to_string())
            }
            Ok(resp) => {
                let error_text = resp.text().await.unwrap_or_default();
                Err(AppError::Internal(format!("Failed to create app folder: {}", error_text)))
            }
            Err(e) => Err(AppError::Internal(format!("Failed to create app folder: {}", e))),
        }
    }
}

#[async_trait]
impl CloudProvider for OneDriveProvider {
    fn provider_type(&self) -> CloudProviderType {
        CloudProviderType::OneDrive
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

        // Build the upload path
        let upload_path = if path.starts_with('/') {
            format!("{}{}", self.get_app_folder_path(), path)
        } else {
            format!("{}/{}", self.get_app_folder_path(), path)
        };

        // For small files (< 4MB), use simple upload
        let data_len = data.len();
        if data_len < 4 * 1024 * 1024 {
            if let Some(p) = &progress {
                p(0, data_len as u64);
            }

            let response = self.http_client
                .put(&format!("{}/{}:/content", self.api_base_url(), upload_path))
                .headers(headers)
                .body(data)
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

            let result: DriveItem = response
                .json()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to parse upload response: {}", e)))?;

            Ok(result.id)
        } else {
            // For large files, use upload session (chunked upload)
            self.upload_file_chunked(&upload_path, &data, progress).await
        }
    }

    async fn download_file(
        &self,
        path: &str,
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<Vec<u8>, AppError> {
        let headers = self.get_auth_headers()?;

        let download_path = if path.starts_with('/') {
            format!("{}{}", self.get_app_folder_path(), path)
        } else {
            format!("{}/{}", self.get_app_folder_path(), path)
        };

        // Get download URL first
        let response = self.http_client
            .get(&format!("{}/{}:/content", self.api_base_url(), download_path))
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Download failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Download failed: {}", error_text)));
        }

        // Download file content
        let data = response
            .bytes()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to download file: {}", e)))?
            .to_vec();

        if let Some(p) = &progress {
            p(data.len() as u64, data.len() as u64);
        }

        Ok(data)
    }

    async fn list_files(&self, path: &str) -> Result<Vec<FileInfo>, AppError> {
        let headers = self.get_auth_headers()?;

        let list_path = if path.is_empty() || path == "/" {
            self.get_app_folder_path()
        } else if path.starts_with('/') {
            format!("{}{}", self.get_app_folder_path(), path)
        } else {
            format!("{}/{}", self.get_app_folder_path(), path)
        };

        let response = self.http_client
            .get(&format!("{}/{}", self.api_base_url(), list_path))
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("List files failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("List files failed: {}", error_text)));
        }

        let drive_item: DriveItem = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse list response: {}", e)))?;

        let files = drive_item
            .children
            .unwrap_or_default()
            .into_iter()
            .map(|item| {
                let name = item.name.clone();
                FileInfo {
                    id: item.id,
                    name: name.clone(),
                    path: format!("{}/{}", path.trim_start_matches('/'), name),
                    size: item.size.unwrap_or(0),
                    modified_time: item.last_modified_date_time.unwrap_or_else(|| Utc::now()),
                    is_folder: item.folder.is_some(),
                    mime_type: item.file.and_then(|f| f.mime_type),
                }
            })
            .collect();

        Ok(files)
    }

    async fn delete_file(&self, path: &str) -> Result<(), AppError> {
        let headers = self.get_auth_headers()?;

        let delete_path = if path.starts_with('/') {
            format!("{}{}", self.get_app_folder_path(), path)
        } else {
            format!("{}/{}", self.get_app_folder_path(), path)
        };

        let response = self.http_client
            .delete(&format!("{}/{}", self.api_base_url(), delete_path))
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
        let headers = self.get_auth_headers()?;

        let metadata_path = if path.starts_with('/') {
            format!("{}{}", self.get_app_folder_path(), path)
        } else {
            format!("{}/{}", self.get_app_folder_path(), path)
        };

        let response = self.http_client
            .get(&format!("{}/{}", self.api_base_url(), metadata_path))
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Get metadata failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Get metadata failed: {}", error_text)));
        }

        let item: DriveItem = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse metadata response: {}", e)))?;

        Ok(FileMetadata {
            id: item.id,
            name: item.name,
            size: item.size.unwrap_or(0),
            created_time: item.created_date_time,
            modified_time: item.last_modified_date_time.unwrap_or_else(|| Utc::now()),
            checksum: item.file.and_then(|f| f.hashes.and_then(|h| h.sha256_hash)),
        })
    }

    async fn create_folder(&self, path: &str) -> Result<String, AppError> {
        let headers = self.get_auth_headers()?;

        let folder_name = if path.contains('/') {
            path.rsplit('/').next().unwrap_or(path)
        } else {
            path
        };

        let parent_path = if path.contains('/') {
            let pos = path.rfind('/').unwrap();
            &path[..pos]
        } else {
            ""
        };

        let base_path = if parent_path.is_empty() || parent_path == "/" {
            self.get_app_folder_path()
        } else {
            format!("{}/{}", self.get_app_folder_path(), parent_path.trim_start_matches('/'))
        };

        let create_folder_body = serde_json::json!({
            "name": folder_name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "rename"
        });

        let response = self.http_client
            .post(&format!("{}/children", base_path))
            .headers(headers)
            .json(&create_folder_body)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Create folder failed: {}", e)))?;

        if !response.status().is_success() && response.status() != 409 {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Create folder failed: {}", error_text)));
        }

        Ok(folder_name.to_string())
    }

    async fn exists(&self, path: &str) -> Result<bool, AppError> {
        match self.get_metadata(path).await {
            Ok(_) => Ok(true),
            Err(e) if e.to_string().contains("not found") => Ok(false),
            Err(e) => Err(e),
        }
    }
}

impl OneDriveProvider {
    /// Upload a large file using chunked upload
    async fn upload_file_chunked(
        &self,
        path: &str,
        data: &[u8],
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<String, AppError> {
        const CHUNK_SIZE: usize = 320 * 1024 * 1024; // 320MB chunks

        // Create upload session
        let headers = self.get_auth_headers()?;
        let upload_session_body = serde_json::json!({
            "item": {
                "name": path.rsplit('/').last().unwrap_or("file"),
                "@microsoft.graph.conflictBehavior": "rename"
            }
        });

        let session_response = self.http_client
            .post(&format!("{}/{}:/createUploadSession", self.api_base_url(), path))
            .headers(headers)
            .json(&upload_session_body)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Upload session creation failed: {}", e)))?;

        if !session_response.status().is_success() {
            let error_text = session_response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Upload session creation failed: {}", error_text)));
        }

        let session: UploadSession = session_response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse upload session: {}", e)))?;

        // Upload chunks
        let total_size = data.len() as u64;
        let mut uploaded = 0u64;

        for (chunk_index, chunk) in data.chunks(CHUNK_SIZE).enumerate() {
            let chunk_start = uploaded;
            let chunk_end = uploaded + chunk.len() as u64 - 1;

            let chunk_headers = self.get_auth_headers()?;
            let content_range = format!("bytes {}-{}/{}", chunk_start, chunk_end, total_size);

            let chunk_response = self.http_client
                .put(&session.upload_url)
                .header("Content-Range", content_range)
                .header("Content-Length", chunk.len())
                .headers(chunk_headers)
                .body(chunk.to_vec())
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("Chunk upload failed: {}", e)))?;

            if !chunk_response.status().is_success() && chunk_response.status() != 202 {
                let error_text = chunk_response.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Chunk upload failed: {}", error_text)));
            }

            uploaded = chunk_end + 1;

            if let Some(p) = &progress {
                p(uploaded, total_size);
            }
        }

        // Get the final drive item
        let final_response = self.http_client
            .get(&session.upload_url)
            .headers(self.get_auth_headers()?)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to get upload result: {}", e)))?;

        if !final_response.status().is_success() {
            let error_text = final_response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Failed to get upload result: {}", error_text)));
        }

        let result: DriveItem = final_response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse upload result: {}", e)))?;

        Ok(result.id)
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
    #[serde(rename = "displayName")]
    display_name: String,
    mail: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DriveItem {
    id: String,
    name: String,
    size: Option<u64>,
    #[serde(rename = "createdDateTime")]
    created_date_time: Option<DateTime<Utc>>,
    #[serde(rename = "lastModifiedDateTime")]
    last_modified_date_time: Option<DateTime<Utc>>,
    folder: Option<serde_json::Value>,
    file: Option<File>,
    children: Option<Vec<DriveItem>>,
}

#[derive(Debug, Deserialize)]
struct File {
    #[serde(rename = "mimeType")]
    mime_type: Option<String>,
    hashes: Option<Hashes>,
}

#[derive(Debug, Deserialize)]
struct Hashes {
    #[serde(rename = "sha256Hash")]
    sha256_hash: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UploadSession {
    #[serde(rename = "uploadUrl")]
    upload_url: String,
    #[serde(rename = "expirationDateTime")]
    expiration_date_time: DateTime<Utc>,
}
