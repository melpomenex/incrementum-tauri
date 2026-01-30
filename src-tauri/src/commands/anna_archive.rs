//! LibGen.li integration for book search and download
//!
//! This module provides functionality to search for books on Library Genesis (libgen.li)
//! and download them directly into the user's library.
//!
//! Note: This module is named "anna_archive" for UI consistency, but it uses
//! the Library Genesis (LibGen) backend which provides easier access to book searches.

use crate::error::Result;
use serde::{Deserialize, Serialize};
use regex::Regex;
use std::collections::HashSet;
use std::time::Duration;
use futures_util::StreamExt;

/// LibGen mirror domains (in order of preference)
/// Updated to working mirrors as of 2025
/// libgen.li is prioritized as it uses the modern index.php search interface
const LIBGEN_MIRRORS: &[&str] = &[
    "https://libgen.li",
    "https://libgen.is",
    "https://libgen.gs",
    "http://gen.lib.rus.ec",
];

/// Book format types supported for download
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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
    Rtf,
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
            BookFormat::Rtf => write!(f, "rtf"),
        }
    }
}

impl BookFormat {
    /// Parse from file extension string
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "pdf" => Some(BookFormat::Pdf),
            "epub" => Some(BookFormat::Epub),
            "mobi" => Some(BookFormat::Mobi),
            "azw" | "azw3" => Some(BookFormat::Azw3),
            "djvu" => Some(BookFormat::Djvu),
            "cbz" => Some(BookFormat::Cbz),
            "cbr" => Some(BookFormat::Cbr),
            "zip" => Some(BookFormat::Zip),
            "rtf" => Some(BookFormat::Rtf),
            _ => None,
        }
    }
}

/// Book search result from LibGen
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
    pub file_size: Option<String>,
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

/// Internal state for LibGen client
#[derive(Clone)]
pub struct AnnaArchiveClient {
    current_mirror_index: usize,
    http_client: reqwest::Client,
}

impl AnnaArchiveClient {
    /// Create a new LibGen client
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
        LIBGEN_MIRRORS.get(self.current_mirror_index)
            .copied()
            .unwrap_or(LIBGEN_MIRRORS[0])
    }

    /// Try the next mirror
    fn try_next_mirror(&mut self) -> Option<&'static str> {
        if self.current_mirror_index + 1 < LIBGEN_MIRRORS.len() {
            self.current_mirror_index += 1;
            Some(self.get_current_mirror())
        } else {
            None
        }
    }

    /// Search for books on LibGen
    /// Uses the modern index.php search interface with column parameters
    pub async fn search_books(&self, query: &str, limit: usize) -> Result<Vec<BookSearchResult>> {
        // Encode the search query
        let encoded_query = urlencoding::encode(query);

        // Build the search URL using libgen.li's index.php format
        // This format searches across all fields and topics for maximum coverage
        let search_url = format!(
            "{}/index.php?req={}&columns%5B%5D=t&columns%5B%5D=a&columns%5B%5D=s&columns%5B%5D=y&columns%5B%5D=p&columns%5B%5D=i&objects%5B%5D=f&objects%5B%5D=e&objects%5B%5D=s&objects%5B%5D=a&objects%5B%5D=p&objects%5B%5D=w&topics%5B%5D=l&topics%5B%5D=c&topics%5B%5D=f&topics%5B%5D=a&topics%5B%5D=m&topics%5B%5D=r&topics%5B%5D=s&res={}&filesuns=all&curtab=f",
            self.get_current_mirror(),
            encoded_query,
            limit.min(100)
        );

        // Try to fetch search results
        let response = self.fetch_with_mirror_fallback(&search_url).await?;

        // Parse the HTML response to extract book information
        let results = self.parse_search_results(&response)?;

        Ok(results)
    }

    /// Download a book from LibGen
    pub async fn download_book(
        &self,
        book_id: &str,
        _format: BookFormat,
        download_path: &std::path::Path,
        progress_callback: impl Fn(DownloadProgress),
    ) -> Result<std::path::PathBuf> {
        // LibGen.li download URL format: /ads.php?md5=<md5>&download
        let download_url = format!("{}/ads.php?md5={}&download=1", self.get_current_mirror(), book_id);

        progress_callback(DownloadProgress {
            book_id: book_id.to_string(),
            progress: 0.0,
            bytes_downloaded: 0,
            total_bytes: None,
            status: DownloadStatus::Connecting,
        });

        // Download with progress tracking
        let response = self.http_client
            .get(&download_url)
            .send()
            .await
            .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to connect: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::IncrementumError::Internal(
                format!("Download failed with status: {}", response.status())
            ));
        }

        let total_bytes = response.content_length();
        let final_path = download_path.to_path_buf();

        progress_callback(DownloadProgress {
            book_id: book_id.to_string(),
            progress: 0.0,
            bytes_downloaded: 0,
            total_bytes,
            status: DownloadStatus::Downloading,
        });

        // Stream the response and write to file
        let mut file = tokio::fs::File::create(&final_path).await.map_err(|e| {
            crate::error::IncrementumError::Internal(format!("Failed to create file: {}", e))
        })?;

        let mut stream = response.bytes_stream();
        let mut bytes_downloaded: u64 = 0;

        use futures_util::StreamExt;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| {
                crate::error::IncrementumError::Internal(format!("Failed to download chunk: {}", e))
            })?;

            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await.map_err(|e| {
                crate::error::IncrementumError::Internal(format!("Failed to write to file: {}", e))
            })?;

            bytes_downloaded += chunk.len() as u64;

            let progress = if let Some(total) = total_bytes {
                bytes_downloaded as f32 / total as f32
            } else {
                0.0
            };

            progress_callback(DownloadProgress {
                book_id: book_id.to_string(),
                progress,
                bytes_downloaded,
                total_bytes,
                status: DownloadStatus::Downloading,
            });
        }

        // Flush and close the file
        tokio::io::AsyncWriteExt::flush(&mut file).await.map_err(|e| {
            crate::error::IncrementumError::Internal(format!("Failed to flush file: {}", e))
        })?;

        progress_callback(DownloadProgress {
            book_id: book_id.to_string(),
            progress: 1.0,
            bytes_downloaded,
            total_bytes,
            status: DownloadStatus::Completed,
        });

        Ok(final_path)
    }

    /// Fetch a URL with automatic mirror fallback on failure
    async fn fetch_with_mirror_fallback(&self, url: &str) -> Result<String> {
        let mut client = self.clone();
        let mut last_error = None;

        loop {
            let full_url = if url.starts_with("http") {
                url.to_string()
            } else {
                format!("{}{}", client.get_current_mirror(), url)
            };

            let response = client.http_client
                .get(&full_url)
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

    /// Parse search results from LibGen HTML response
    /// LibGen.li returns results in an HTML table with id "tablelibgen" or "tablelibgen1"
    fn parse_search_results(&self, html: &str) -> Result<Vec<BookSearchResult>> {
        let mut results = Vec::new();
        let mut seen_ids = HashSet::new();

        // Find the table body containing results
        // The table structure has rows with multiple <td> columns
        let table_body_start = html.find("<tbody>").unwrap_or(0);
        let table_body_end = html[table_body_start..].find("</tbody>").map_or(html.len(), |p| table_body_start + p);
        let table_content = &html[table_body_start..table_body_end + 8];

        // Find all table rows
        let row_regex = Regex::new(r#"<tr[^>]*>(.*?)</tr>"#).unwrap();
        
        for caps in row_regex.captures_iter(table_content) {
            let row = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            
            // Skip header rows (they don't have enough columns)
            if row.contains("<th") || row.len() < 100 {
                continue;
            }

            // Extract MD5 from the mirrors column (to use as ID)
            let md5_re = Regex::new(r#"md5=([a-fA-F0-9]{32})"#).unwrap();
            let md5 = md5_re.captures(row)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().to_string())
                .unwrap_or_default();

            // Skip if no MD5 found or already processed
            if md5.is_empty() || !seen_ids.insert(md5.clone()) {
                continue;
            }

            // Parse the row to extract book information
            if let Some(result) = self.parse_table_row(row, &md5) {
                results.push(result);
            }
        }

        Ok(results)
    }

    /// Parse a single table row to extract book information
    /// libgen.li table structure:
    /// Column 1: ID/Time/Title/Series
    /// Column 2: Author(s)
    /// Column 3: Publisher
    /// Column 4: Year
    /// Column 5: Language
    /// Column 6: Pages
    /// Column 7: Size (with file.php?id link)
    /// Column 8: Extension
    /// Column 9: Mirrors
    fn parse_table_row(&self, row: &str, md5: &str) -> Option<BookSearchResult> {
        // Split row into cells
        let cell_regex = Regex::new(r#"<td[^>]*>(.*?)</td>"#).unwrap();
        let cells: Vec<&str> = cell_regex.captures_iter(row)
            .filter_map(|c| c.get(1))
            .map(|m| m.as_str())
            .collect();

        if cells.len() < 8 {
            return None;
        }

        // Extract title from first column
        let title = self.extract_title_from_cell(cells.get(0).unwrap_or(&""))
            .unwrap_or_else(|| "Unknown Title".to_string());

        // Extract author from second column
        let author = self.extract_author_from_cell(cells.get(1).unwrap_or(&""));

        // Extract publisher from third column
        let publisher = self.extract_publisher_from_cell(cells.get(2).unwrap_or(&""));

        // Extract year from fourth column
        let year = self.extract_year_from_cell(cells.get(3).unwrap_or(&""));

        // Extract language from fifth column
        let language = self.extract_language_from_cell(cells.get(4).unwrap_or(&""));

        // Extract file size from seventh column
        let file_size = self.extract_file_size_from_cell(cells.get(6).unwrap_or(&""));

        // Extract format/extension from eighth column
        let formats = self.extract_formats_from_cell(cells.get(7).unwrap_or(&""));

        // Extract file ID from size column for cover URL
        let file_id = self.extract_file_id_from_cell(cells.get(6).unwrap_or(&""));
        let cover_url = file_id.map(|id| format!("{}/covers/{}/{}-g.jpg", 
            self.get_current_mirror(),
            &id[..(id.len().min(3))].to_string(),
            id
        ));

        Some(BookSearchResult {
            id: md5.to_string(),
            title,
            author,
            year,
            publisher,
            language,
            formats,
            cover_url,
            description: None,
            isbn: None,
            md5: Some(md5.to_string()),
            file_size,
        })
    }

    /// Extract title from the first table cell
    /// The first cell contains: Series, Edition info, and Title (with DOI)
    fn extract_title_from_cell(&self, cell: &str) -> Option<String> {
        // Try to find the main title link (usually has edition.php?id= in href)
        // The title is typically the text after a <br> tag and inside an <a> tag
        let title_re = Regex::new(r#"<a[^>]*href="edition\.php[^"]*"[^>]*>([^<]+)</a>"#).unwrap();
        
        if let Some(caps) = title_re.captures(cell) {
            let title = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let cleaned = strip_html_tags(title).trim().to_string();
            if !cleaned.is_empty() && cleaned.len() > 2 {
                return Some(cleaned);
            }
        }

        // Fallback: look for any link text that's long enough to be a title
        let link_re = Regex::new(r#"<a[^>]*>([^<]{10,200})</a>"#).unwrap();
        if let Some(caps) = link_re.captures(cell) {
            let title = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let cleaned = strip_html_tags(title).trim().to_string();
            if !cleaned.is_empty() && cleaned.len() > 3 {
                return Some(cleaned);
            }
        }

        // Last fallback: get text content between <b> tags
        let bold_re = Regex::new(r#"<b>([^<]+)</b>"#).unwrap();
        if let Some(caps) = bold_re.captures(cell) {
            let title = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let cleaned = strip_html_tags(title).trim().to_string();
            if !cleaned.is_empty() && cleaned.len() > 3 {
                return Some(cleaned);
            }
        }

        None
    }

    /// Extract author from the second table cell
    fn extract_author_from_cell(&self, cell: &str) -> Option<String> {
        let cleaned = strip_html_tags(cell).trim().to_string();
        if !cleaned.is_empty() && cleaned.len() > 1 && cleaned.len() < 200 {
            // Remove "Review by:" prefix if present
            let author = cleaned
                .trim_start_matches("Review by:")
                .trim_start_matches("by ")
                .trim()
                .to_string();
            if !author.is_empty() {
                return Some(author);
            }
        }
        None
    }

    /// Extract publisher from the third table cell
    fn extract_publisher_from_cell(&self, cell: &str) -> Option<String> {
        let cleaned = strip_html_tags(cell).trim().to_string();
        if !cleaned.is_empty() && cleaned.len() > 1 && cleaned.len() < 100 {
            return Some(cleaned);
        }
        None
    }

    /// Extract year from the fourth table cell
    fn extract_year_from_cell(&self, cell: &str) -> Option<i32> {
        // Look for 4-digit year patterns
        let year_re = Regex::new(r#"\b(19|20)\d{2}\b"#).unwrap();
        year_re.captures(cell)
            .and_then(|c| c.get(0))
            .and_then(|m| m.as_str().parse::<i32>().ok())
    }

    /// Extract language from the fifth table cell
    fn extract_language_from_cell(&self, cell: &str) -> Option<String> {
        let cleaned = strip_html_tags(cell).trim().to_string();
        if !cleaned.is_empty() && cleaned.len() > 1 && cleaned.len() < 50 {
            return Some(cleaned);
        }
        None
    }

    /// Extract file size from the seventh table cell
    fn extract_file_size_from_cell(&self, cell: &str) -> Option<String> {
        let size_re = Regex::new(r#"(\d+(?:\.\d+)?)\s*(KB|MB|GB|kb|mb|gb)"#).unwrap();
        size_re.captures(cell)
            .and_then(|c| c.get(0))
            .map(|m| m.as_str().to_string())
    }

    /// Extract file ID from the size cell (used for cover URL)
    fn extract_file_id_from_cell(&self, cell: &str) -> Option<String> {
        let id_re = Regex::new(r#"file\.php\?id=(\d+)"#).unwrap();
        id_re.captures(cell)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
    }

    /// Extract format from the eighth table cell
    fn extract_formats_from_cell(&self, cell: &str) -> Vec<BookFormat> {
        let mut formats: Vec<BookFormat> = Vec::new();
        
        // The extension is typically the plain text content of the cell
        let ext = strip_html_tags(cell).trim().to_lowercase();
        
        if let Some(format) = BookFormat::from_extension(&ext) {
            formats.push(format);
        }

        // If no valid format found, try to detect from the cell content
        if formats.is_empty() {
            let cell_upper = cell.to_uppercase();
            if cell_upper.contains("PDF") {
                formats.push(BookFormat::Pdf);
            } else if cell_upper.contains("EPUB") {
                formats.push(BookFormat::Epub);
            } else if cell_upper.contains("MOBI") {
                formats.push(BookFormat::Mobi);
            } else if cell_upper.contains("AZW") {
                formats.push(BookFormat::Azw3);
            } else if cell_upper.contains("DJVU") {
                formats.push(BookFormat::Djvu);
            } else if cell_upper.contains("CBZ") {
                formats.push(BookFormat::Cbz);
            } else if cell_upper.contains("CBR") {
                formats.push(BookFormat::Cbr);
            } else if cell_upper.contains("RTF") {
                formats.push(BookFormat::Rtf);
            }
        }

        // If still no formats found, default to PDF (most common)
        if formats.is_empty() {
            formats.push(BookFormat::Pdf);
        }

        formats
    }
}

/// Strip HTML tags from text
fn strip_html_tags(html: &str) -> String {
    let re = Regex::new(r"<[^>]+>").unwrap();
    let text = re.replace_all(html, "");
    text.trim().to_string()
}

impl Default for AnnaArchiveClient {
    fn default() -> Self {
        Self::new()
    }
}

/// Search for books on LibGen (via "Anna's Archive" UI)
#[tauri::command]
pub async fn search_books(query: String, limit: Option<usize>) -> Result<Vec<BookSearchResult>> {
    let client = AnnaArchiveClient::new();
    let limit = limit.unwrap_or(25).min(100); // Cap at 100 results

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

/// Download result containing the file path and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResult {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
}

/// Download a book from LibGen (via "Anna's Archive" UI)
///
/// The download_path can be either:
/// 1. A full file path (e.g., "/path/to/book.pdf")
/// 2. A directory (the file will be named based on the book_id and format)
/// 3. Empty or "temp" (downloads to system temp directory)
#[tauri::command]
pub async fn download_book(
    book_id: String,
    format: BookFormat,
    download_path: Option<String>,
) -> Result<DownloadResult> {
    let client = AnnaArchiveClient::new();

    // Determine the download directory
    let download_dir = if let Some(path) = download_path {
        if path.is_empty() || path == "temp" {
            // Use system temp directory
            let temp_dir = std::env::temp_dir();
            temp_dir.join("incrementum-downloads")
        } else {
            let path_buf = std::path::PathBuf::from(&path);
            if path_buf.extension().is_some() {
                // It's a file path, get the parent directory
                path_buf.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| {
                    let temp_dir = std::env::temp_dir();
                    temp_dir.join("incrementum-downloads")
                })
            } else {
                // It's a directory
                path_buf
            }
        }
    } else {
        // Use system temp directory
        let temp_dir = std::env::temp_dir();
        temp_dir.join("incrementum-downloads")
    };

    // Ensure download directory exists
    tokio::fs::create_dir_all(&download_dir).await.map_err(|e| {
        crate::error::IncrementumError::Internal(format!("Failed to create download directory: {}", e))
    })?;

    // Generate filename from book_id and format
    let file_name = format!("{}.{}", book_id, format);
    let file_path = download_dir.join(&file_name);

    // Download the book
    let final_path = client.download_book(&book_id, format.clone(), &file_path, |progress| {
        // TODO: Emit progress event to frontend via Tauri events
        eprintln!("Download progress: {:?}", progress);
    }).await?;

    // Get file size
    let file_size = tokio::fs::metadata(&final_path).await
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(DownloadResult {
        file_path: final_path.to_string_lossy().to_string(),
        file_name,
        file_size,
    })
}

/// Get available LibGen mirrors
#[tauri::command]
pub fn get_available_mirrors() -> Vec<String> {
    LIBGEN_MIRRORS.iter().map(|s| s.to_string()).collect()
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
    fn test_book_format_from_extension() {
        assert_eq!(BookFormat::from_extension("pdf"), Some(BookFormat::Pdf));
        assert_eq!(BookFormat::from_extension("PDF"), Some(BookFormat::Pdf));
        assert_eq!(BookFormat::from_extension("epub"), Some(BookFormat::Epub));
        assert_eq!(BookFormat::from_extension("mobi"), Some(BookFormat::Mobi));
        assert_eq!(BookFormat::from_extension("azw3"), Some(BookFormat::Azw3));
        assert_eq!(BookFormat::from_extension("azw"), Some(BookFormat::Azw3));
        assert_eq!(BookFormat::from_extension("djvu"), Some(BookFormat::Djvu));
        assert_eq!(BookFormat::from_extension("rtf"), Some(BookFormat::Rtf));
        assert_eq!(BookFormat::from_extension("unknown"), None);
    }

    #[test]
    fn test_client_creation() {
        let client = AnnaArchiveClient::new();
        assert_eq!(client.current_mirror_index, 0);
        assert_eq!(client.get_current_mirror(), LIBGEN_MIRRORS[0]);
        // Verify libgen.li is the primary mirror
        assert!(client.get_current_mirror().contains("libgen.li"));
    }

    #[test]
    fn test_mirror_fallback() {
        let mut client = AnnaArchiveClient::new();
        assert_eq!(client.get_current_mirror(), LIBGEN_MIRRORS[0]);

        // Try next mirror
        let next = client.try_next_mirror();
        assert!(next.is_some());
        assert_eq!(client.get_current_mirror(), LIBGEN_MIRRORS[1]);

        // Exhaust mirrors
        for _ in 1..LIBGEN_MIRRORS.len() {
            client.try_next_mirror();
        }
        assert!(client.try_next_mirror().is_none());
    }

    #[test]
    fn test_get_available_mirrors_command() {
        let mirrors = get_available_mirrors();
        assert!(!mirrors.is_empty());
        assert_eq!(mirrors.len(), LIBGEN_MIRRORS.len());
    }

    #[test]
    fn test_strip_html_tags() {
        assert_eq!(strip_html_tags("<p>Hello World</p>"), "Hello World");
        assert_eq!(strip_html_tags("<a href='#'>Link</a>"), "Link");
        assert_eq!(strip_html_tags("   Text   "), "Text");
    }

    #[test]
    fn test_parse_table_row_libgen_li() {
        let client = AnnaArchiveClient::new();
        
        // Sample HTML row from libgen.li (simplified)
        let sample_row = r#"<td><b><a href="series.php?id=9930">Some Series</a> <a href="edition.php?id=123"><i> 1995</i></a></b><br><a href="edition.php?id=123">The Moral Animal: Why We Are the Way We Are</a><br><i><font color="green">DOI: 10.1207/test</font></i> <nobr><span class="badge badge-primary"><a title="Journal article">a</a></span> <span class="badge badge-secondary">a 12345</span></nobr></td><td>Robert Wright</td><td>Vintage</td><td><nobr>1994</nobr></td><td>English</td><td>496</td><td><nobr><a href="/file.php?id=45534852">2.5 MB</a></nobr></td><td>pdf</td><td><a href="/ads.php?md5=aa3b4fec2d13149bd9a84ea27142bcdf"><span class="badge badge-primary">Libgen</span></a></td>"#;
        
        let md5 = "aa3b4fec2d13149bd9a84ea27142bcdf";
        let result = client.parse_table_row(sample_row, md5);
        
        assert!(result.is_some());
        let book = result.unwrap();
        
        assert_eq!(book.id, md5);
        assert_eq!(book.md5, Some(md5.to_string()));
        // Title should be extracted from the edition link
        assert!(book.title.contains("Moral Animal"), "Title should contain 'Moral Animal', got: {}", book.title);
        assert_eq!(book.author, Some("Robert Wright".to_string()));
        assert_eq!(book.publisher, Some("Vintage".to_string()));
        assert_eq!(book.year, Some(1994));
        assert_eq!(book.language, Some("English".to_string()));
        assert_eq!(book.file_size, Some("2.5 MB".to_string()));
        assert!(!book.formats.is_empty());
        assert!(book.formats.contains(&BookFormat::Pdf));
        assert!(book.cover_url.is_some());
    }

    #[test]
    fn test_extract_title_from_cell() {
        let client = AnnaArchiveClient::new();
        
        let cell = r#"<b><a href="series.php?id=1">Series</a> <a href="edition.php?id=123"><i> 2020</i></a></b><br><a href="edition.php?id=123">Book Title Here</a>"#;
        let title = client.extract_title_from_cell(cell);
        
        assert!(title.is_some());
        assert_eq!(title.unwrap(), "Book Title Here");
    }

    #[test]
    fn test_extract_formats_from_cell() {
        let client = AnnaArchiveClient::new();
        
        // Test PDF detection
        let formats = client.extract_formats_from_cell("pdf");
        assert!(formats.contains(&BookFormat::Pdf));
        
        // Test EPUB detection
        let formats = client.extract_formats_from_cell("epub");
        assert!(formats.contains(&BookFormat::Epub));
        
        // Test MOBI detection (uppercase)
        let formats = client.extract_formats_from_cell("MOBI");
        assert!(formats.contains(&BookFormat::Mobi));
    }

    #[test]
    fn test_extract_file_size_from_cell() {
        let client = AnnaArchiveClient::new();
        
        let cell = r#"<nobr><a href="/file.php?id=12345">2.5 MB</a></nobr>"#;
        let size = client.extract_file_size_from_cell(cell);
        
        assert_eq!(size, Some("2.5 MB".to_string()));
    }

    #[test]
    fn test_extract_file_id_from_cell() {
        let client = AnnaArchiveClient::new();
        
        let cell = r#"<nobr><a href="/file.php?id=45534852">2.5 MB</a></nobr>"#;
        let file_id = client.extract_file_id_from_cell(cell);
        
        assert_eq!(file_id, Some("45534852".to_string()));
    }
}
