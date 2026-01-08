//! OAuth commands for cloud storage providers
//!
//! Handles OAuth authentication flow for OneDrive, Google Drive, and Dropbox

use crate::cloud::{
    AccountInfo, AuthResult, CloudProvider, CloudProviderType,
    OneDriveConfig, OneDriveProvider,
    GoogleDriveConfig, GoogleDriveProvider,
    DropboxConfig, DropboxProvider,
};

/// Start OAuth authentication flow
#[tauri::command]
pub async fn oauth_start(provider_type: String) -> Result<String, String> {
    let provider_type = CloudProviderType::from_str(&provider_type)
        .ok_or_else(|| format!("Unknown provider type: {}", provider_type))?;

    // Create provider instance
    let mut provider: Box<dyn CloudProvider> = match provider_type {
        CloudProviderType::OneDrive => {
            Box::new(OneDriveProvider::new(OneDriveConfig::default()))
        }
        CloudProviderType::GoogleDrive => {
            Box::new(GoogleDriveProvider::new(GoogleDriveConfig::default()))
        }
        CloudProviderType::Dropbox => {
            Box::new(DropboxProvider::new(DropboxConfig::default()))
        }
    };

    // Start authentication
    provider
        .authenticate()
        .await
        .map_err(|e| e.to_string())
}

/// Handle OAuth callback
#[tauri::command]
pub async fn oauth_callback(
    provider_type: String,
    code: String,
    state: String,
) -> Result<AuthResult, String> {
    let provider_type = CloudProviderType::from_str(&provider_type)
        .ok_or_else(|| format!("Unknown provider type: {}", provider_type))?;

    // Create provider instance
    let mut provider: Box<dyn CloudProvider> = match provider_type {
        CloudProviderType::OneDrive => {
            Box::new(OneDriveProvider::new(OneDriveConfig::default()))
        }
        CloudProviderType::GoogleDrive => {
            Box::new(GoogleDriveProvider::new(GoogleDriveConfig::default()))
        }
        CloudProviderType::Dropbox => {
            Box::new(DropboxProvider::new(DropboxConfig::default()))
        }
    };

    // Handle the callback
    provider
        .handle_callback(&code, &state)
        .await
        .map_err(|e| e.to_string())
}

/// Get account info for authenticated provider
#[tauri::command]
pub async fn oauth_get_account(
    provider_type: String,
) -> Result<AccountInfo, String> {
    let _provider_type = CloudProviderType::from_str(&provider_type)
        .ok_or_else(|| format!("Unknown provider type: {}", provider_type))?;

    // TODO: Retrieve stored authenticated provider
    // For now, return an error since we don't have persistent storage yet
    Err(format!("No authenticated {} provider found. Please authenticate first.", provider_type))
}

/// Disconnect provider
#[tauri::command]
pub async fn oauth_disconnect(
    provider_type: String,
) -> Result<(), String> {
    let _provider_type = CloudProviderType::from_str(&provider_type)
        .ok_or_else(|| format!("Unknown provider type: {}", provider_type))?;

    // TODO: Retrieve and disconnect the stored provider
    // For now, just return success
    Ok(())
}

/// Check if provider is authenticated
#[tauri::command]
pub async fn oauth_is_authenticated(
    provider_type: String,
) -> Result<bool, String> {
    let _provider_type = CloudProviderType::from_str(&provider_type)
        .ok_or_else(|| format!("Unknown provider type: {}", provider_type))?;

    // TODO: Check if there's a stored authenticated provider
    Ok(false)
}
