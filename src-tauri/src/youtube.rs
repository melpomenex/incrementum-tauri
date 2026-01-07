//! YouTube integration using yt-dlp
//!
//! This module provides functionality to interact with YouTube videos
//! through the yt-dlp command-line tool.

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;
use tauri::State;

use crate::database::Repository;

/// YouTube video metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YouTubeVideoInfo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub channel: String,
    pub channel_id: Option<String>,
    pub duration: u64,
    pub view_count: u64,
    pub upload_date: String,
    pub thumbnail: String,
    pub publish_date: String,
    pub tags: Vec<String>,
    pub category: String,
    pub live_content: bool,
}

/// YouTube format info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YouTubeFormat {
    pub format_id: String,
    pub ext: String,
    pub quality: String,
    pub filesize: Option<u64>,
    pub vcodec: String,
    pub acodec: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<u32>,
}

/// YouTube transcript segment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub text: String,
    pub start: f64,
    pub duration: f64,
}

/// Download options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadOptions {
    pub quality: String,
    pub format: String,
    pub output_template: String,
    pub subtitles: bool,
    pub auto_captions: bool,
    pub embed_subs: bool,
}

impl Default for DownloadOptions {
    fn default() -> Self {
        Self {
            quality: "best".to_string(),
            format: "bestvideo+bestaudio/best".to_string(),
            output_template: "%(title)s.%(ext)s".to_string(),
            subtitles: true,
            auto_captions: true,
            embed_subs: false,
        }
    }
}

/// Check if yt-dlp is installed
pub fn check_ytdlp_installed() -> Result<bool, String> {
    let output = Command::new("yt-dlp")
        .arg("--version")
        .output();

    match output {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Get yt-dlp version
pub fn get_ytdlp_version() -> Result<String, String> {
    let output = Command::new("yt-dlp")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        return Err("yt-dlp command failed".to_string());
    }

    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(version)
}

/// Extract video info using yt-dlp
pub fn extract_video_info(url: &str) -> Result<YouTubeVideoInfo, String> {
    let output = Command::new("yt-dlp")
        .args([
            "--dump-json",
            "--no-playlist",
            url,
        ])
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", error));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(parse_video_json(&json))
}

/// Parse video JSON from yt-dlp
fn parse_video_json(json: &serde_json::Value) -> YouTubeVideoInfo {
    let id = json["id"].as_str().unwrap_or("").to_string();
    let title = json["title"].as_str().unwrap_or("Unknown").to_string();
    let description = json["description"].as_str().unwrap_or("").to_string();
    let channel = json["channel"].as_str().unwrap_or("Unknown").to_string();
    let channel_id = json["channel_id"].as_str().map(|s| s.to_string());
    let duration = json["duration"].as_u64().unwrap_or(0);
    let view_count = json["view_count"].as_u64().unwrap_or(0);
    let upload_date = json["upload_date"].as_str().unwrap_or("").to_string();
    let thumbnail = json["thumbnail"].as_str().unwrap_or("").to_string();
    let tags = json["tags"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let category = json["categories"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let live_content = json["is_live"].as_bool().unwrap_or(false);

    // Format publish date
    let publish_date = if upload_date.len() >= 8 {
        format!("{}-{}-{}", &upload_date[0..4], &upload_date[4..6], &upload_date[6..8])
    } else {
        String::new()
    };

    YouTubeVideoInfo {
        id,
        title,
        description,
        channel,
        channel_id,
        duration,
        view_count,
        upload_date,
        thumbnail,
        publish_date,
        tags,
        category,
        live_content,
    }
}

/// Get available formats for a video
pub fn get_video_formats(url: &str) -> Result<Vec<YouTubeFormat>, String> {
    let output = Command::new("yt-dlp")
        .args([
            "--dump-json",
            "--list-formats",
            "--no-playlist",
            url,
        ])
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", error));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let formats = json["formats"]
        .as_array()
        .ok_or("No formats found")?;

    let result = formats
        .iter()
        .filter_map(|f| {
            Some(YouTubeFormat {
                format_id: f["format_id"].as_str()?.to_string(),
                ext: f["ext"].as_str()?.to_string(),
                quality: f["format_note"].as_str().or(f["format"].as_str()).unwrap_or("unknown").to_string(),
                filesize: f["filesize"].as_u64(),
                vcodec: f["vcodec"].as_str().or(f["vcodec"].as_str()).unwrap_or("none").to_string(),
                acodec: f["acodec"].as_str().or(f["acodec"].as_str()).unwrap_or("none").to_string(),
                width: f["width"].as_u64().map(|w| w as u32),
                height: f["height"].as_u64().map(|h| h as u32),
                fps: f["fps"].as_u64().map(|f| f as u32),
            })
        })
        .collect();

    Ok(result)
}

/// Download video with options
pub fn download_video(
    url: &str,
    output_dir: PathBuf,
    options: &DownloadOptions,
) -> Result<PathBuf, String> {
    // Create output directory if it doesn't exist
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    let output_path = output_dir.join(&options.output_template);

    let mut cmd = Command::new("yt-dlp");

    // Add format selection
    cmd.arg("-f").arg(&options.format);

    // Add output template
    cmd.arg("-o").arg(output_path.to_str().unwrap());

    // Add subtitle options
    if options.subtitles {
        cmd.arg("--write-subs");
        cmd.arg("--sub-lang").arg("en");
    }

    if options.auto_captions {
        cmd.arg("--write-auto-subs");
    }

    if options.embed_subs {
        cmd.arg("--embed-subs");
    }

    cmd.arg(url);

    let output = cmd.output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp download failed: {}", error));
    }

    // Return the downloaded file path (would need to parse output to get actual filename)
    Ok(output_dir)
}

/// Extract transcript using yt-dlp
pub fn extract_transcript(url: &str, language: Option<&str>) -> Result<Vec<TranscriptSegment>, String> {
    let mut cmd = Command::new("yt-dlp");
    cmd.args(["--write-subs", "--sub-lang", language.unwrap_or("en"), "--skip-download", "-o", "%(id)s", url]);

    let output = cmd.output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to extract transcript: {}", error));
    }

    // Parse the downloaded subtitle file (VTT format)
    // This is a simplified implementation
    // In production, would parse the VTT/SRT file properly

    Ok(vec![])
}

/// Search YouTube (requires API key for full results)
pub fn search_youtube(query: &str, api_key: Option<&str>) -> Result<Vec<serde_json::Value>, String> {
    // yt-dlp can do basic search without API key
    let output = Command::new("yt-dlp")
        .args([
            "ytsearch5:",
            query,
            "--dump-json",
            "--flat-playlist",
        ])
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Search failed: {}", error));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let entries = json["entries"]
        .as_array()
        .ok_or("No search results")?;

    Ok(entries.clone())
}

/// Get playlist info
pub fn get_playlist_info(url: &str) -> Result<serde_json::Value, String> {
    let output = Command::new("yt-dlp")
        .args([
            "--dump-json",
            "--flat-playlist",
            url,
        ])
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to get playlist: {}", error));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(json)
}

/// Extract video ID from URL
pub fn extract_video_id(url: &str) -> Option<String> {
    // Various YouTube URL patterns
    let patterns = [
        r"(?i)youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})",
        r"(?i)youtu\.be\/([a-zA-Z0-9_-]{11})",
        r"(?i)youtube\.com\/embed\/([a-zA-Z0-9_-]{11})",
        r"(?i)youtube\.com\/v\/([a-zA-Z0-9_-]{11})",
        r"(?i)youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})",
    ];

    for pattern in patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if let Some(caps) = re.captures(url) {
                if let Some(id) = caps.get(1) {
                    return Some(id.as_str().to_string());
                }
            }
        }
    }

    None
}

/// Tauri command: Check if yt-dlp is available
#[tauri::command]
pub async fn check_ytdlp() -> Result<bool, String> {
    check_ytdlp_installed()
}

/// Tauri command: Get video info
#[tauri::command]
pub async fn get_youtube_video_info(url: String) -> Result<YouTubeVideoInfo, String> {
    extract_video_info(&url)
}

/// Tauri command: Get video formats
#[tauri::command]
pub async fn get_youtube_formats(url: String) -> Result<Vec<YouTubeFormat>, String> {
    get_video_formats(&url)
}

/// Tauri command: Download video
#[tauri::command]
pub async fn download_youtube_video(
    url: String,
    output_dir: String,
    options: Option<DownloadOptions>,
) -> Result<String, String> {
    let opts = options.unwrap_or_default();
    let path = download_video(&url, PathBuf::from(output_dir), &opts)?;
    Ok(path.to_string_lossy().to_string())
}

/// Tauri command: Extract transcript
#[tauri::command]
pub async fn get_youtube_transcript(
    url: String,
    language: Option<String>,
) -> Result<Vec<TranscriptSegment>, String> {
    extract_transcript(&url, language.as_deref())
}

/// Tauri command: Search YouTube
#[tauri::command]
pub async fn search_youtube_videos(
    query: String,
    api_key: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    search_youtube(&query, api_key.as_deref())
}

/// Tauri command: Get playlist info
#[tauri::command]
pub async fn get_youtube_playlist_info(url: String) -> Result<serde_json::Value, String> {
    get_playlist_info(&url)
}

/// Tauri command: Extract video ID
#[tauri::command]
pub async fn extract_youtube_video_id(url: String) -> Result<Option<String>, String> {
    Ok(extract_video_id(&url))
}

/// Import YouTube video to database
#[tauri::command]
pub async fn import_youtube_video(
    url: String,
    repo: State<'_, Repository>,
) -> Result<String, String> {
    let info = extract_video_info(&url)?;

    // Import as document
    let document_id = uuid::Uuid::new_v4().to_string();

    // Create document record for YouTube video
    // This would integrate with the existing document system

    Ok(document_id)
}
