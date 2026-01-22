//! Anna's Archive integration for book search and download
//!
//! This module provides functionality to search for books on Anna's Archive
//! and download them directly into the user's library.

use crate::error::Result;
use serde::{Deserialize, Serialize};
use regex::Regex;
use std::collections::HashSet;
use std::time::Duration;

/// Anna's Archive mirror domains (in order of preference)
const ANNA_ARCHIVE_MIRRORS: &[&str] = &[
    "https://annas-archive.org",
    "https://annas-archive.gs",
    "https://annas-archive.se",
    "https://annas-archive.is",
    "https://anna-archive-gs mirrors.online",
];

/// Book format types supported for download
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BookFormat {
    Pdf,
    Epub,
    Mobi,
    Azw3,
    Djvu,
    Cbz,
    Cbr,
    Zip,
}

impl std::fmt::Display for BookFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BookFormat::Pdf => write!(f, "pdf"),
            BookFormat::Epub => write!(f, "epub"),
            BookFormat::Mobi => write!(f, "mobi"),
            BookFormat::Azw3 => write!(f, "azw3"),
            BookFormat::Djvu => write!(f, "djvu"),
            BookFormat::Cbz => write!(f, "cbz"),
            BookFormat::Cbr => write!(f, "cbr"),
            BookFormat::Zip => write!(f, "zip"),
        }
    }
}

/// Book search result from Anna's Archive
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookSearchResult {
    pub id: String,
    pub title: String,
    pub author: Option<String>,
    pub year: Option<i32>,
    pub publisher: Option<String>,
    pub language: Option<String>,
    pub formats: Vec<BookFormat>,
    pub cover_url: Option<String>,
    pub description: Option<String>,
    pub isbn: Option<String>,
    pub md5: Option<String>,
}

/// Download progress update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub book_id: String,
    pub progress: f32, // 0.0 to 1.0
    pub bytes_downloaded: u64,
    pub total_bytes: Option<u64>,
    pub status: DownloadStatus,
}

/// Download status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DownloadStatus {
    Connecting,
    Downloading,
    Completed,
    Failed(String),
    Cancelled,
}

/// Internal state for Anna's Archive client
#[derive(Clone)]
pub struct AnnaArchiveClient {
    current_mirror_index: usize,
    http_client: reqwest::Client,
}

impl AnnaArchiveClient {
    /// Create a new Anna's Archive client
    pub fn new() -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .unwrap_or_default();

        Self {
            current_mirror_index: 0,
            http_client,
        }
    }

    /// Get the current mirror URL
    fn get_current_mirror(&self) -> &'static str {
        ANNA_ARCHIVE_MIRRORS.get(self.current_mirror_index)
            .copied()
            .unwrap_or(ANNA_ARCHIVE_MIRRORS[0])
    }

    /// Try the next mirror
    fn try_next_mirror(&mut self) -> Option<&'static str> {
        if self.current_mirror_index + 1 < ANNA_ARCHIVE_MIRRORS.len() {
            self.current_mirror_index += 1;
            Some(self.get_current_mirror())
        } else {
            None
        }
    }

    /// Search for books on Anna's Archive
    pub async fn search_books(&self, query: &str, limit: usize) -> Result<Vec<BookSearchResult>> {
        // Encode the search query
        let encoded_query = urlencoding::encode(query);
        let search_url = format!(
            "{}/search?q={}&index={}",
            self.get_current_mirror(),
            encoded_query,
            limit
        );

        // Try to fetch search results
        let response = self.fetch_with_mirror_fallback(&search_url).await?;

        // Parse the HTML response to extract book information
        let results = self.parse_search_results(&response)?;

        Ok(results)
    }

    /// Download a book from Anna's Archive
    pub async fn download_book(
        &self,
        book_id: &str,
        format: BookFormat,
        download_path: &std::path::Path,
        progress_callback: impl Fn(DownloadProgress),
    ) -> Result<std::path::PathBuf> {
        // Get the download URL for this book
        let download_url = self.get_download_url(book_id, &format).await?;

        // Download with progress tracking
        let response = self.http_client
            .get(&download_url)
            .send()
            .await
            .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to connect: {}", e)))?;

        let total_bytes = response.content_length();
        let final_path = download_path.to_path_buf();

        progress_callback(DownloadProgress {
            book_id: book_id.to_string(),
            progress: 0.0,
            bytes_downloaded: 0,
            total_bytes,
            status: DownloadStatus::Connecting,
        });

        // TODO: Implement actual file download with progress tracking
        // This requires streaming the response and writing to disk

        Ok(final_path)
    }

    /// Get the download URL for a specific book format
    async fn get_download_url(&self, book_id: &str, format: &BookFormat) -> Result<String> {
        let url = format!(
            "{}/download/{}?format={}",
            self.get_current_mirror(),
            book_id,
            format
        );

        // Follow redirects to get the actual download URL
        let response = self.fetch_with_mirror_fallback(&url).await?;

        // The response should contain the actual download URL or redirect
        Ok(url)
    }

    /// Fetch a URL with automatic mirror fallback on failure
    async fn fetch_with_mirror_fallback(&self, url: &str) -> Result<String> {
        let mut client = self.clone();
        let mut last_error = None;

        loop {
            let response = client.http_client
                .get(url)
                .send()
                .await;

            match response {
                Ok(resp) => {
                    if resp.status().is_success() {
                        let text = resp.text().await.map_err(|e| {
                            crate::error::IncrementumError::Internal(format!("Failed to read response: {}", e))
                        })?;
                        return Ok(text);
                    } else {
                        last_error = Some(format!("HTTP error: {}", resp.status()));
                    }
                }
                Err(e) => {
                    last_error = Some(format!("Network error: {}", e));
                }
            }

            // Try next mirror
            if let Some(_next_mirror) = client.try_next_mirror() {
                continue;
            } else {
                break;
            }
        }

        Err(crate::error::IncrementumError::Internal(format!(
            "Failed to fetch URL after trying all mirrors: {}",
            last_error.unwrap_or_else(|| "Unknown error".to_string())
        )))
    }

    /// Parse search results from HTML response
    fn parse_search_results(&self, html: &str) -> Result<Vec<BookSearchResult>> {
        let mut results = Vec::new();
        let mut seen_ids = HashSet::new();

        let id_re = Regex::new(r#"href="/md5/([a-fA-F0-9]{32})""#).unwrap();
        let img_re = Regex::new(r#"(?is)<img[^>]+(?:data-src|src)="([^"]+)""#).unwrap();
        let title_re = Regex::new(r#"(?is)title="([^"]+)""#).unwrap();
        let author_re = Regex::new(r#"(?is)by\s+([^<]+)<"#).unwrap();

        for caps in id_re.captures_iter(html) {
            let id = caps.get(1).map(|m| m.as_str().to_string()).unwrap_or_default();
            if id.is_empty() || !seen_ids.insert(id.clone()) {
                continue;
            }

            let start = caps.get(0).map(|m| m.start()).unwrap_or(0);
            let end = (start + 2000).min(html.len());
            let snippet = &html[start..end];

            let cover_url = img_re
                .captures(snippet)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().trim().to_string())
                .map(|url| normalize_cover_url(&url, self.get_current_mirror()));

            let title = title_re
                .captures(snippet)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().trim().to_string())
                .filter(|t| !t.is_empty())
                .unwrap_or_else(|| "Unknown Title".to_string());

            let author = author_re
                .captures(snippet)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().trim().to_string())
                .filter(|a| !a.is_empty());

            results.push(BookSearchResult {
                id,
                title,
                author,
                year: None,
                publisher: None,
                language: None,
                formats: Vec::new(),
                cover_url,
                description: None,
                isbn: None,
                md5: None,
            });
        }

        Ok(results)
    }
}

fn normalize_cover_url(url: &str, base: &str) -> String {
    if url.starts_with("//") {
        format!("https:{}", url)
    } else if url.starts_with('/') {
        format!("{}{}", base, url)
    } else {
        url.to_string()
    }
}

impl Default for AnnaArchiveClient {
    fn default() -> Self {
        Self::new()
    }
}

/// Search for books on Anna's Archive
#[tauri::command]
pub async fn search_books(query: String, limit: Option<usize>) -> Result<Vec<BookSearchResult>> {
    let client = AnnaArchiveClient::new();
    let limit = limit.unwrap_or(20).min(100); // Cap at 100 results

    // Implement rate limiting with exponential backoff
    let mut attempts = 0;
    let max_attempts = 3;

    loop {
        match client.search_books(&query, limit).await {
            Ok(results) => return Ok(results),
            Err(e) => {
                attempts += 1;
                if attempts >= max_attempts {
                    return Err(e);
                }
                // Exponential backoff: 2^attempts seconds
                let backoff_ms = 1000 * (2_u64.pow(attempts as u32 - 1));
                tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
            }
        }
    }
}

/// Download a book from Anna's Archive
#[tauri::command]
pub async fn download_book(
    book_id: String,
    format: BookFormat,
    download_path: String,
) -> Result<String> {
    let client = AnnaArchiveClient::new();
    let path = std::path::PathBuf::from(download_path);

    // Ensure download directory exists
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| {
            crate::error::IncrementumError::Internal(format!("Failed to create download directory: {}", e))
        })?;
    }

    let final_path = client.download_book(&book_id, format, &path, |progress| {
        // TODO: Emit progress event to frontend via Tauri events
        eprintln!("Download progress: {:?}", progress);
    }).await?;

    Ok(final_path.to_string_lossy().to_string())
}

/// Get available Anna's Archive mirrors
#[tauri::command]
pub fn get_available_mirrors() -> Vec<String> {
    ANNA_ARCHIVE_MIRRORS.iter().map(|s| s.to_string()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_book_format_display() {
        assert_eq!(BookFormat::Pdf.to_string(), "pdf");
        assert_eq!(BookFormat::Epub.to_string(), "epub");
        assert_eq!(BookFormat::Mobi.to_string(), "mobi");
    }

    #[test]
    fn test_client_creation() {
        let client = AnnaArchiveClient::new();
        assert_eq!(client.current_mirror_index, 0);
        assert_eq!(client.get_current_mirror(), ANNA_ARCHIVE_MIRRORS[0]);
    }

    #[test]
    fn test_mirror_fallback() {
        let mut client = AnnaArchiveClient::new();
        assert_eq!(client.get_current_mirror(), ANNA_ARCHIVE_MIRRORS[0]);

        // Try next mirror
        let next = client.try_next_mirror();
        assert!(next.is_some());
        assert_eq!(client.get_current_mirror(), ANNA_ARCHIVE_MIRRORS[1]);

        // Exhaust mirrors
        for _ in 1..ANNA_ARCHIVE_MIRRORS.len() {
            client.try_next_mirror();
        }
        assert!(client.try_next_mirror().is_none());
    }

    #[test]
    fn test_get_available_mirrors_command() {
        let mirrors = get_available_mirrors();
        assert!(!mirrors.is_empty());
        assert_eq!(mirrors.len(), ANNA_ARCHIVE_MIRRORS.len());
    }
}
