//! YouTube integration using yt-dlp
//!
//! This module provides functionality to interact with YouTube videos
//! through the yt-dlp command-line tool.

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;
use tauri::State;

use crate::database::Repository;
use crate::models::{Document, DocumentMetadata, FileType};

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

fn build_transcript_text(segments: &[TranscriptSegment]) -> String {
    segments
        .iter()
        .map(|segment| segment.text.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

fn parse_transcript_segments(json: &str) -> Result<Vec<TranscriptSegment>, String> {
    serde_json::from_str(json).map_err(|e| format!("Failed to parse transcript cache: {}", e))
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
    // Create temp directory for subtitle download
    let temp_dir = std::env::temp_dir();
    let lang = language.unwrap_or("en");

    // Get video info first to extract the video ID
    let info_output = Command::new("yt-dlp")
        .args([
            "--print", "%(id)s",
            "--no-playlist",
            url,
        ])
        .output()
        .map_err(|e| format!("Failed to get video info: {}", e))?;

    if !info_output.status.success() {
        let error = String::from_utf8_lossy(&info_output.stderr);
        // Check for bot detection error
        if error.contains("Sign in to confirm") || error.contains("not a bot") {
            return Err(
                "YouTube is requiring sign-in to access this video.\n\n\
                To fix this, you can try:\n\
                1. Open YouTube in your browser and watch any video briefly\n\
                2. Export your browser cookies and configure yt-dlp to use them:\n\
                   yt-dlp --cookies-from-browser firefox/chrome [URL]\n\
                3. Try a different video\n\n\
                See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp for more info.".to_string()
            );
        }
        return Err(format!("Failed to get video info: {}", error));
    }

    let video_id = String::from_utf8_lossy(&info_output.stdout).trim().to_string();

    // Download subtitles using yt-dlp
    // Note: YouTube may block requests; using --extractor-args to try to mitigate this
    let output = Command::new("yt-dlp")
        .args([
            "--write-subs",
            "--write-auto-subs",
            "--sub-langs", lang,
            "--sub-format", "vtt",
            "--skip-download",
            "--no-playlist",
            "--extractor-args", "youtube:player_skip=js_guard",
            "-o", &format!("{}/%(id)s", temp_dir.to_string_lossy()),
            url,
        ])
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;
    
    // Check stderr for bot detection even if command succeeded
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains("Sign in to confirm") || stderr.contains("not a bot") {
        return Err(
            "YouTube is requiring sign-in to access this video.\n\n\
            To fix this, you can try:\n\
            1. Open YouTube in your browser and watch any video briefly\n\
            2. Export your browser cookies and configure yt-dlp to use them:\n\
               yt-dlp --cookies-from-browser firefox/chrome [URL]\n\
            3. Try a different video\n\n\
            See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp for more info.".to_string()
        );
    }

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        // Check for bot detection error
        if error.contains("Sign in to confirm") || error.contains("not a bot") {
            return Err(
                "YouTube is requiring sign-in to access this video.\n\n\
                To fix this, you can try:\n\
                1. Open YouTube in your browser and watch any video briefly\n\
                2. Export your browser cookies and configure yt-dlp to use them:\n\
                   yt-dlp --cookies-from-browser firefox/chrome [URL]\n\
                3. Try a different video\n\n\
                See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp for more info.".to_string()
            );
        }
        // If subtitles aren't available, return empty rather than error
        if error.contains("Subtitles not available") 
            || error.contains("video doesn't have subtitles")
            || error.contains("Could not find automatic captions") {
            return Ok(vec![]);
        }
        // Log the error but don't fail - try fallback methods
        eprintln!("yt-dlp warning: {}", error);
    }

    // Look for subtitle files with various naming patterns
    let subtitle_patterns = [
        format!("{}.{lang}.vtt", video_id),
        format!("{}.{}.vtt", video_id, lang.split('-').next().unwrap_or(lang)),
        format!("{}.vtt", video_id),
    ];

    // Check for subtitle files
    for pattern in &subtitle_patterns {
        let path = temp_dir.join(pattern);
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                let parsed = parse_vtt(&content);
                let _ = std::fs::remove_file(&path); // Clean up
                if !parsed.is_empty() {
                    return Ok(parsed);
                }
            }
        }
    }

    // Also check for any files starting with video_id in temp dir
    let subtitle_files = std::fs::read_dir(&temp_dir)
        .map_err(|e| format!("Failed to read temp dir: {}", e))?;

    for entry in subtitle_files.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            // Check if file starts with video_id and is a subtitle file
            if name.starts_with(&video_id) && (name.ends_with(".vtt") || name.ends_with(".srt")) {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    let parsed = if name.ends_with(".vtt") {
                        parse_vtt(&content)
                    } else {
                        parse_srt(&content)
                    };
                    
                    // Clean up the subtitle file
                    let _ = std::fs::remove_file(&path);

                    if !parsed.is_empty() {
                        return Ok(parsed);
                    }
                }
            }
        }
    }

    Ok(vec![])
}

/// Parse WebVTT format
fn parse_vtt(content: &str) -> Vec<TranscriptSegment> {
    let mut segments = Vec::new();
    let lines: Vec<&str> = content.lines().collect();

    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();

        // Skip header and empty lines
        if line.is_empty() || line == "WEBVTT" {
            i += 1;
            continue;
        }

        // Look for timestamp line: 00:00:00.000 --> 00:00:02.500
        if let Some(timestamp_match) = parse_timestamp_line(line) {
            let (start, end) = timestamp_match;

            // Collect text until next timestamp or empty line
            i += 1;
            let mut text_lines = Vec::new();
            while i < lines.len() && !lines[i].trim().is_empty() && !lines[i].contains("-->") {
                let text_line = lines[i].trim();
                if !text_line.starts_with("NOTE") && !text_line.starts_with("STYLE") {
                    // Remove VTT formatting tags
                    let clean = clean_vtt_text(text_line);
                    if !clean.is_empty() {
                        text_lines.push(clean);
                    }
                }
                i += 1;
            }

            if !text_lines.is_empty() {
                segments.push(TranscriptSegment {
                    text: text_lines.join(" "),
                    start,
                    duration: end - start,
                });
            }
        } else {
            i += 1;
        }
    }

    segments
}

/// Parse timestamp line from VTT
fn parse_timestamp_line(line: &str) -> Option<(f64, f64)> {
    let parts: Vec<&str> = line.split("-->").collect();
    if parts.len() != 2 {
        return None;
    }

    let start = parse_vtt_timestamp(parts[0].trim())?;
    let end = parse_vtt_timestamp(parts[1].split_whitespace().next().unwrap_or(parts[1].trim()))?;

    Some((start, end))
}

/// Parse VTT timestamp (HH:MM:SS.mmm or MM:SS.mmm)
fn parse_vtt_timestamp(ts: &str) -> Option<f64> {
    let parts: Vec<&str> = ts.split(':').collect();
    if parts.is_empty() || parts.len() > 3 {
        return None;
    }

    let seconds_part = parts.last()?;
    let seconds: f64 = seconds_part.parse().ok()?;

    if parts.len() == 3 {
        let hours: f64 = parts[0].parse().ok()?;
        let minutes: f64 = parts[1].parse().ok()?;
        Some(hours * 3600.0 + minutes * 60.0 + seconds)
    } else if parts.len() == 2 {
        let minutes: f64 = parts[0].parse().ok()?;
        Some(minutes * 60.0 + seconds)
    } else {
        Some(seconds)
    }
}

/// Clean VTT text - remove formatting tags
fn clean_vtt_text(text: &str) -> String {
    let cleaned = text.to_string();

    // Remove XML-like tags by iterating through the string
    let mut result = String::new();
    let mut in_tag = false;
    let mut tag_chars = Vec::new();

    for ch in cleaned.chars() {
        if ch == '<' {
            in_tag = true;
            tag_chars.clear();
        } else if ch == '>' {
            in_tag = false;
            tag_chars.clear();
        } else if in_tag {
            tag_chars.push(ch);
        } else {
            result.push(ch);
        }
    }

    // Clean up extra whitespace
    result.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Parse SRT format
fn parse_srt(content: &str) -> Vec<TranscriptSegment> {
    let mut segments = Vec::new();
    let blocks: Vec<&str> = content.split("\n\n").collect();

    for block in blocks {
        let lines: Vec<&str> = block.lines().collect();
        if lines.len() < 3 {
            continue;
        }

        // Skip index line (first line)
        // Parse timestamp line (second line)
        let ts_line = lines.get(1).unwrap_or(&"");
        if let Some((start, end)) = parse_srt_timestamp_line(ts_line) {
            // Collect remaining lines as text
            let text: String = lines[2..].iter()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty())
                .map(clean_vtt_text)
                .collect::<Vec<_>>()
                .join(" ");

            if !text.is_empty() {
                segments.push(TranscriptSegment {
                    text,
                    start,
                    duration: end - start,
                });
            }
        }
    }

    segments
}

/// Parse SRT timestamp line: 00:00:00,000 --> 00:00:02,500
fn parse_srt_timestamp_line(line: &str) -> Option<(f64, f64)> {
    let parts: Vec<&str> = line.split("-->").collect();
    if parts.len() != 2 {
        return None;
    }

    let start = parse_srt_timestamp(parts[0].trim())?;
    let end = parse_srt_timestamp(parts[1].trim())?;

    Some((start, end))
}

/// Parse SRT timestamp (HH:MM:SS,mmm or MM:SS,mmm)
fn parse_srt_timestamp(ts: &str) -> Option<f64> {
    let ts_normalized = ts.replace(',', ".");
    let parts: Vec<&str> = ts_normalized.split(':').collect();
    if parts.is_empty() || parts.len() > 3 {
        return None;
    }

    let seconds: f64 = parts.last()?.parse().ok()?;

    if parts.len() == 3 {
        let hours: f64 = parts[0].parse().ok()?;
        let minutes: f64 = parts[1].parse().ok()?;
        Some(hours * 3600.0 + minutes * 60.0 + seconds)
    } else if parts.len() == 2 {
        let minutes: f64 = parts[0].parse().ok()?;
        Some(minutes * 60.0 + seconds)
    } else {
        Some(seconds)
    }
}

/// Search YouTube (requires API key for full results)
pub fn search_youtube(query: &str, _api_key: Option<&str>) -> Result<Vec<serde_json::Value>, String> {
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

/// Tauri command: Extract transcript (accepts videoId or URL)
#[tauri::command]
pub async fn get_youtube_transcript(
    url: String,
    language: Option<String>,
    document_id: Option<String>,
    repo: State<'_, Repository>,
) -> Result<Vec<TranscriptSegment>, String> {
    if let Some(video_id) = extract_video_id(&url) {
        if let Ok(Some((_transcript, segments_json))) = repo
            .get_youtube_transcript_by_video_id(&video_id)
            .await
        {
            return parse_transcript_segments(&segments_json);
        }
    }

    let url_clone = url.clone();
    let lang = language.clone();

    // Use spawn_blocking to avoid blocking the async runtime
    let segments = tokio::task::spawn_blocking(move || {
        extract_transcript(&url_clone, lang.as_deref())
    })
    .await
    .map_err(|e| format!("Failed to join transcript task: {}", e))??;

    if let Some(video_id) = extract_video_id(&url) {
        let transcript = build_transcript_text(&segments);
        let segments_json = serde_json::to_string(&segments)
            .map_err(|e| format!("Failed to serialize transcript: {}", e))?;
        repo.upsert_youtube_transcript(document_id.as_deref(), &video_id, &transcript, &segments_json)
            .await
            .map_err(|e| format!("Failed to cache transcript: {}", e))?;
    }

    Ok(segments)
}

/// Tauri command: Extract transcript by videoId
#[tauri::command]
pub async fn get_youtube_transcript_by_id(
    video_id: String,
    language: Option<String>,
    document_id: Option<String>,
    repo: State<'_, Repository>,
) -> Result<Vec<TranscriptSegment>, String> {
    if let Ok(Some((_transcript, segments_json))) = repo
        .get_youtube_transcript_by_video_id(&video_id)
        .await
    {
        return parse_transcript_segments(&segments_json);
    }

    // Construct YouTube URL from video ID
    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    let lang = language.clone();

    // Use spawn_blocking to avoid blocking the async runtime
    let segments = tokio::task::spawn_blocking(move || {
        extract_transcript(&url, lang.as_deref())
    })
    .await
    .map_err(|e| format!("Failed to join transcript task: {}", e))??;

    let transcript = build_transcript_text(&segments);
    let segments_json = serde_json::to_string(&segments)
        .map_err(|e| format!("Failed to serialize transcript: {}", e))?;
    repo.upsert_youtube_transcript(document_id.as_deref(), &video_id, &transcript, &segments_json)
        .await
        .map_err(|e| format!("Failed to cache transcript: {}", e))?;

    Ok(segments)
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
) -> Result<Document, String> {
    // First, verify yt-dlp is available
    let ytdlp_available = check_ytdlp_installed()
        .map_err(|e| format!("Failed to check yt-dlp: {}", e))?;

    if !ytdlp_available {
        return Err("yt-dlp is not installed. Please install it to import YouTube videos.".to_string());
    }

    // Extract video info
    let info = extract_video_info(&url)
        .map_err(|e| format!("Failed to fetch video info: {}", e))?;

    // Extract video ID for the file path
    let video_id = &info.id;

    // Create document record for YouTube video
    let mut doc = Document::new(info.title.clone(), format!("https://www.youtube.com/watch?v={}", video_id), FileType::Youtube);

    // Set YouTube-specific fields
    doc.category = Some("YouTube Videos".to_string());
    doc.tags = vec!["youtube".to_string(), "video".to_string()];
    doc.total_pages = Some(info.duration as i32);
    doc.priority_score = 7.0; // YouTube videos get higher priority
    if !info.thumbnail.is_empty() {
        doc.cover_image_url = Some(info.thumbnail.clone());
        doc.cover_image_source = Some("youtube".to_string());
    }

    // Set metadata with YouTube info
    // Use current time if publish_date is not available or invalid
    let created_at = chrono::Utc::now();

    doc.metadata = Some(DocumentMetadata {
        author: Some(info.channel),
        subject: None,
        keywords: if info.tags.is_empty() { None } else { Some(info.tags) },
        created_at: Some(created_at),
        modified_at: None,
        file_size: None,
        language: Some("en".to_string()),
        page_count: None,
        word_count: None,
    });

    // Save to database
    let created = repo.create_document(&doc).await
        .map_err(|e| format!("Failed to save document to database: {}", e))?;

    Ok(created)
}
