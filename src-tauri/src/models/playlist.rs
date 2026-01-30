//! YouTube playlist subscription models

use serde::{Deserialize, Serialize};

/// A subscription to a YouTube playlist for auto-import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistSubscription {
    pub id: String,
    pub playlist_id: String,
    pub playlist_url: String,
    pub title: Option<String>,
    pub channel_name: Option<String>,
    pub channel_id: Option<String>,
    pub description: Option<String>,
    pub thumbnail_url: Option<String>,
    pub total_videos: Option<i32>,
    
    // Auto-import settings
    pub is_active: bool,
    pub auto_import_new: bool,
    pub queue_intersperse_interval: i32,
    pub priority_rating: i32,
    
    // Refresh tracking
    pub last_refreshed_at: Option<String>,
    pub refresh_interval_hours: i32,
    
    // Metadata
    pub created_at: String,
    pub modified_at: String,
}

/// A video from a subscribed playlist
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistVideo {
    pub id: String,
    pub subscription_id: String,
    pub video_id: String,
    pub video_title: Option<String>,
    pub video_duration: Option<i32>,
    pub thumbnail_url: Option<String>,
    pub position: Option<i32>,
    
    // Import status
    pub is_imported: bool,
    pub document_id: Option<String>,
    
    // Queue interspersion tracking
    pub added_to_queue: bool,
    pub queue_position: Option<i32>,
    
    // Metadata
    pub published_at: Option<String>,
    pub discovered_at: String,
    pub imported_at: Option<String>,
}

/// Global settings for YouTube playlist integration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistSettings {
    pub id: String,
    pub enabled: bool,
    pub default_intersperse_interval: i32,
    pub default_priority: i32,
    pub max_consecutive_playlist_videos: i32,
    pub prefer_new_videos: bool,
    pub created_at: String,
    pub modified_at: String,
}

/// Information about a playlist video for interspersion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistVideoForQueue {
    pub playlist_video_id: String,
    pub video_id: String,
    pub video_title: String,
    pub document_id: String,
    pub subscription_id: String,
    pub subscription_title: Option<String>,
    pub priority_rating: i32,
}
