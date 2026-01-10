//! Dropbox Cloud Provider Implementation
//!
//! Implements OAuth 2.0 authentication and file operations for Dropbox
//! using Dropbox API v2.

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

/// Dropbox OAuth configuration
pub struct DropboxConfig {
    pub app_key: String,
    pub app_secret: String,
    pub redirect_uri: String,
}

impl Default for DropboxConfig {
    fn default() -> Self {
        Self {
            // Credentials can be set via environment variables:
            // INCREMENTUM_DROPBOX_APP_KEY and INCREMENTUM_DROPBOX_APP_SECRET
            app_key: std::env::var("INCREMENTUM_DROPBOX_APP_KEY")
                .unwrap_or_else(|_| "YOUR_APP_KEY".to_string()),
            app_secret: std::env::var("INCREMENTUM_DROPBOX_APP_SECRET")
                .unwrap_or_else(|_| "YOUR_APP_SECRET".to_string()),
            redirect_uri: "http://localhost:15173/auth/callback".to_string(),
        }
    }
}

/// Dropbox provider implementation
pub struct DropboxProvider {
    config: DropboxConfig,
    http_client: Client,
    auth_token: Option<AuthToken>,
    account_info: Option<AccountInfo>,
    // For OAuth state validation
    pending_state: Option<String>,
    pkce_verifier: Option<String>,
}

impl DropboxProvider {
    /// Create a new Dropbox provider
    pub fn new(config: DropboxConfig) -> Self {
        Self {
            config,
            http_client: Client::new(),
            auth_token: None,
            account_info: None,
            pending_state: None,
            pkce_verifier: None,
        }
    }

    /// Get the Dropbox API base URL
    fn api_base_url(&self) -> &str {
        "https://api.dropboxapi.com/2"
    }

    /// Get the Dropbox content base URL
    fn content_base_url(&self) -> &str {
        "https://content.dropboxapi.com/2"
    }

    /// Get the OAuth authorization URL with PKCE
    fn get_auth_url(&mut self) -> Result<String, AppError> {
        // Validate credentials before attempting OAuth
        if self.config.app_key == "YOUR_APP_KEY" || self.config.app_key.is_empty() {
            return Err(AppError::Internal(
                "Dropbox OAuth is not configured. Please set the INCREMENTUM_DROPBOX_APP_KEY \
                 environment variable with your Dropbox app key.\n\n\
                 To configure Dropbox:\n\
                 1. Go to https://www.dropbox.com/developers/apps\n\
                 2. Create a new app (scoped access)\n\
                 3. Add http://localhost:15173/auth/callback as a redirect URI\n\
                 4. Copy the app key\n\
                 5. Set the INCREMENTUM_DROPBOX_APP_KEY environment variable".to_string()
            ));
        }

        if self.config.app_secret == "YOUR_APP_SECRET" || self.config.app_secret.is_empty() {
            return Err(AppError::Internal(
                "Dropbox OAuth is not configured. Please set the INCREMENTUM_DROPBOX_APP_SECRET \
                 environment variable with your Dropbox app secret.\n\n\
                 To configure Dropbox:\n\
                 1. Go to https://www.dropbox.com/developers/apps\n\
                 2. Select your app\n\
                 3. Copy the app secret\n\
                 4. Set the INCREMENTUM_DROPBOX_APP_SECRET environment variable".to_string()
            ));
        }

        let (state, code_verifier, code_challenge) = self.generate_pkce();
        self.pending_state = Some(state.clone());
        self.pkce_verifier = Some(code_verifier);

        let mut url = Url::parse("https://www.dropbox.com/oauth2/authorize")
            .map_err(|e| AppError::Internal(format!("Failed to parse auth URL: {}", e)))?;

        url.query_pairs_mut()
            .append_pair("client_id", &self.config.app_key)
            .append_pair("response_type", "code")
            .append_pair("redirect_uri", &self.config.redirect_uri)
            .append_pair("state", &state)
            .append_pair("code_challenge", &code_challenge)
            .append_pair("code_challenge_method", "S256")
            .append_pair("token_access_type", "offline")
            .append_pair("force_reapprove", "false"); // Don't force reapproval

        Ok(url.to_string())
    }

    /// Generate PKCE (Proof Key for Code Exchange) parameters
    fn generate_pkce(&self) -> (String, String, String) {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let state = format!("dropbox_{}", timestamp);

        // Generate code verifier (random 43-128 characters)
        use rand::Rng;
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
        let code_verifier: String = (0..64)
            .map(|_| {
                let idx = rand::thread_rng().gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect();

        // Generate code challenge (SHA256 hash, base64url encoded)
        use sha2::{Sha256, Digest};
        use base64::Engine;
        let mut hasher = Sha256::new();
        hasher.update(code_verifier.as_bytes());
        let hash = hasher.finalize();
        let code_challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&hash);

        (state, code_verifier, code_challenge)
    }

    /// Exchange authorization code for tokens
    async fn exchange_code_for_token(&self, code: &str) -> Result<TokenResponse, AppError> {
        let mut params = HashMap::new();
        params.insert("code", code.to_string());
        params.insert("grant_type", "authorization_code".to_string());
        params.insert("redirect_uri", self.config.redirect_uri.clone());

        if let Some(verifier) = &self.pkce_verifier {
            params.insert("code_verifier", verifier.clone());
        }

        let auth_header = format!("{}:{}", self.config.app_key, self.config.app_secret);
        use base64::Engine;
        let encoded_auth = base64::engine::general_purpose::STANDARD.encode(auth_header);

        let response = self.http_client
            .post("https://api.dropboxapi.com/oauth2/token")
            .header("Authorization", format!("Basic {}", encoded_auth))
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

    /// Refresh the access token (Dropbox uses long-lived tokens, but we can refresh)
    async fn refresh_access_token(&self, refresh_token: &str) -> Result<TokenResponse, AppError> {
        let mut params = HashMap::new();
        params.insert("grant_type", "refresh_token".to_string());
        params.insert("refresh_token", refresh_token.to_string());

        let auth_header = format!("{}:{}", self.config.app_key, self.config.app_secret);
        use base64::Engine;
        let encoded_auth = base64::engine::general_purpose::STANDARD.encode(auth_header);

        let response = self.http_client
            .post("https://api.dropboxapi.com/oauth2/token")
            .header("Authorization", format!("Basic {}", encoded_auth))
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

    /// Fetch account information from Dropbox
    async fn fetch_account_info(&self) -> Result<AccountInfo, AppError> {
        let headers = self.get_auth_headers()?;

        let response = self.http_client
            .post(&format!("{}/users/get_current_account", self.api_base_url()))
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

        // Get space quota
        let space_response = self.http_client
            .post(&format!("{}/users/get_space_usage", self.api_base_url()))
            .headers(self.get_auth_headers()?)
            .send()
            .await;

        let storage_quota = match space_response {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(space) = resp.json::<SpaceUsage>().await {
                    let allocated = space.allocated.unwrap_or(0);
                    Some(StorageQuota {
                        used: space.used,
                        total: allocated,
                    })
                } else {
                    None
                }
            }
            _ => None,
        };

        Ok(AccountInfo {
            account_id: user_info.account_id,
            account_name: user_info.name.display_name,
            email: Some(user_info.email),
            storage_quota,
        })
    }

    /// Get the Incrementum app folder path
    fn get_app_folder_path(&self) -> String {
        "/Incrementum".to_string()
    }
}

#[async_trait]
impl CloudProvider for DropboxProvider {
    fn provider_type(&self) -> CloudProviderType {
        CloudProviderType::Dropbox
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

        // Calculate token expiration (Dropbox tokens are long-lived, ~4 hours)
        let expires_at = Utc::now() + Duration::seconds(token_response.expires_in as i64);

        // Store auth token
        self.auth_token = Some(AuthToken {
            access_token: token_response.access_token.clone(),
            refresh_token: token_response.refresh_token.unwrap_or(token_response.access_token.clone()),
            expires_at,
            token_type: token_response.token_type.unwrap_or("Bearer".to_string()),
        });

        // Fetch account info
        let account_info = self.fetch_account_info().await?;
        self.account_info = Some(account_info.clone());

        // Clear pending state
        self.pending_state = None;
        self.pkce_verifier = None;

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
            refresh_token: token_response.refresh_token.unwrap_or(refresh_token),
            expires_at,
            token_type: token_response.token_type.unwrap_or("Bearer".to_string()),
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
        self.pkce_verifier = None;
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
        let full_path = format!("/Incrementum/{}", path.trim_start_matches('/'));
        let data_len = data.len();

        if let Some(p) = &progress {
            p(0, data_len as u64);
        }

        // For small files (<150MB), use simple upload
        if data_len < 150 * 1024 * 1024 {
            let upload_path = serde_json::json!({ "path": full_path }).to_string();

            let response = self.http_client
                .post(&format!(
                    "{}/files/upload",
                    self.content_base_url()
                ))
                .header("Dropbox-API-Arg", upload_path)
                .header("Content-Type", "application/octet-stream")
                .header("Authorization", format!("Bearer {}", self.auth_token.as_ref().unwrap().access_token))
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

            let result: FileResult = response
                .json()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to parse upload response: {}", e)))?;

            Ok(result.id)
        } else {
            // For large files, use upload session (chunked upload)
            self.upload_file_chunked(&full_path, &data, progress).await
        }
    }

    async fn download_file(
        &self,
        path: &str,
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<Vec<u8>, AppError> {
        let full_path = format!("/Incrementum/{}", path.trim_start_matches('/'));
        let arg = serde_json::json!({ "path": full_path }).to_string();

        let response = self.http_client
            .post(&format!(
                "{}/files/download",
                self.content_base_url()
            ))
            .header("Dropbox-API-Arg", arg)
            .header("Authorization", format!("Bearer {}", self.auth_token.as_ref().unwrap().access_token))
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Download failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Download failed: {}", error_text)));
        }

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
        let full_path = if path.is_empty() || path == "/" {
            "/Incrementum".to_string()
        } else {
            format!("/Incrementum/{}", path.trim_start_matches('/'))
        };

        let arg = serde_json::json!({
            "path": full_path,
            "recursive": false,
            "include_media_info": false
        }).to_string();

        let response = self.http_client
            .post(&format!("{}/files/list_folder", self.api_base_url()))
            .header("Dropbox-API-Arg", arg)
            .headers(self.get_auth_headers()?)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("List files failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("List files failed: {}", error_text)));
        }

        let list_response: ListFolderResult = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse list response: {}", e)))?;

        let files = list_response
            .entries
            .into_iter()
            .map(|entry| {
                let name = entry.name.clone();
                FileInfo {
                    id: entry.id,
                    name: name.clone(),
                    path: format!("{}/{}", path.trim_start_matches('/'), name),
                    size: entry.size.unwrap_or(0),
                    modified_time: entry.client_modified.unwrap_or_else(|| Utc::now()),
                    is_folder: entry.tag == "folder",
                    mime_type: None,
                }
            })
            .collect();

        Ok(files)
    }

    async fn delete_file(&self, path: &str) -> Result<(), AppError> {
        let full_path = format!("/Incrementum/{}", path.trim_start_matches('/'));
        let arg = serde_json::json!({ "path": full_path }).to_string();

        let response = self.http_client
            .post(&format!("{}/files/delete_v2", self.api_base_url()))
            .header("Dropbox-API-Arg", arg)
            .headers(self.get_auth_headers()?)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Delete failed: {}", e)))?;

        if !response.status().is_success() && response.status() != 409 {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Delete failed: {}", error_text)));
        }

        Ok(())
    }

    async fn get_metadata(&self, path: &str) -> Result<FileMetadata, AppError> {
        let full_path = format!("/Incrementum/{}", path.trim_start_matches('/'));
        let arg = serde_json::json!({
            "path": full_path,
            "include_media_info": false
        }).to_string();

        let response = self.http_client
            .post(&format!("{}/files/get_metadata", self.api_base_url()))
            .header("Dropbox-API-Arg", arg)
            .headers(self.get_auth_headers()?)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Get metadata failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Get metadata failed: {}", error_text)));
        }

        let dropbox_metadata: DropboxFileMetadata = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse metadata response: {}", e)))?;

        // Convert Dropbox metadata to provider FileMetadata
        Ok(FileMetadata {
            id: dropbox_metadata.id,
            name: dropbox_metadata.name,
            size: dropbox_metadata.size.unwrap_or(0),
            created_time: dropbox_metadata.client_modified,
            modified_time: dropbox_metadata.server_modified
                .or(dropbox_metadata.client_modified)
                .unwrap_or_else(|| Utc::now()),
            checksum: None,
        })
    }

    async fn create_folder(&self, path: &str) -> Result<String, AppError> {
        let full_path = format!("/Incrementum/{}", path.trim_start_matches('/'));
        let arg = serde_json::json!({
            "path": full_path,
            "autorename": false
        }).to_string();

        let response = self.http_client
            .post(&format!("{}/files/create_folder_v2", self.api_base_url()))
            .header("Dropbox-API-Arg", arg)
            .headers(self.get_auth_headers()?)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Create folder failed: {}", e)))?;

        if !response.status().is_success() && response.status() != 409 {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Create folder failed: {}", error_text)));
        }

        let folder_name = if path.contains('/') {
            path.rsplit('/').last().unwrap_or(path)
        } else {
            path
        };

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

impl DropboxProvider {
    /// Upload a large file using chunked upload session
    async fn upload_file_chunked(
        &self,
        path: &str,
        data: &[u8],
        progress: Option<Box<dyn Fn(u64, u64) + Send + Sync>>,
    ) -> Result<String, AppError> {
        const CHUNK_SIZE: usize = 8 * 1024 * 1024; // 8MB chunks

        // Start upload session
        let arg = serde_json::json!({
            "path": path,
            "mode": "add"
        }).to_string();

        let start_response = self.http_client
            .post(&format!("{}/files/upload_session/start", self.content_base_url()))
            .header("Dropbox-API-Arg", arg)
            .header("Content-Type", "application/octet-stream")
            .header("Authorization", format!("Bearer {}", self.auth_token.as_ref().unwrap().access_token))
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Upload session creation failed: {}", e)))?;

        if !start_response.status().is_success() {
            let error_text = start_response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Upload session creation failed: {}", error_text)));
        }

        let session_id: String = start_response
            .headers()
            .get("dropbox-api-result")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| serde_json::from_str::<SessionStart>(s).ok())
            .map(|s| s.session_id)
            .ok_or_else(|| AppError::Internal("Failed to get session ID".to_string()))?;

        // Upload chunks
        let total_size = data.len() as u64;
        let mut uploaded = 0u64;

        for (chunk_index, chunk) in data.chunks(CHUNK_SIZE).enumerate() {
            let chunk_start = uploaded;
            let chunk_end = uploaded + chunk.len() as u64 - 1;

            let cursor = serde_json::json!({
                "session_id": session_id,
                "offset": chunk_start
            }).to_string();

            let close = if chunk_end + 1 >= total_size {
                true
            } else {
                false
            };

            let chunk_response = self.http_client
                .post(&format!(
                    "{}/files/upload_session/append_v2{}",
                    self.content_base_url(),
                    if close { "/finish" } else { "" }
                ))
                .header("Dropbox-API-Arg", cursor)
                .header("Content-Type", "application/octet-stream")
                .header("Authorization", format!("Bearer {}", self.auth_token.as_ref().unwrap().access_token))
                .body(chunk.to_vec())
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("Chunk upload failed: {}", e)))?;

            if !chunk_response.status().is_success() && chunk_response.status() != 200 {
                let error_text = chunk_response.text().await.unwrap_or_default();
                return Err(AppError::Internal(format!("Chunk upload failed: {}", error_text)));
            }

            uploaded = chunk_end + 1;

            if let Some(p) = &progress {
                p(uploaded, total_size);
            }
        }

        // Get the final file ID
        let metadata = self.get_metadata(&path.trim_start_matches("/Incrementum/")).await?;
        Ok(metadata.id)
    }
}

// ============ API Response Types ============

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
    token_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UserInfo {
    account_id: String,
    name: NameInfo,
    email: String,
}

#[derive(Debug, Deserialize)]
struct NameInfo {
    display_name: String,
}

#[derive(Debug, Deserialize)]
struct SpaceUsage {
    used: u64,
    allocated: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct FileResult {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct ListFolderResult {
    entries: Vec<DropboxFileMetadata>,
}

#[derive(Debug, Deserialize)]
struct DropboxFileMetadata {
    #[serde(rename = ".tag")]
    tag: String,
    id: String,
    name: String,
    size: Option<u64>,
    #[serde(rename = "client_modified")]
    client_modified: Option<DateTime<Utc>>,
    #[serde(rename = "server_modified")]
    server_modified: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
struct SessionStart {
    session_id: String,
}
