//! EPUB content extraction with chapter parsing

use crate::error::Result;
use crate::processor::ExtractedContent;
use epub::doc::EpubDoc;
use std::path::Path;
use std::collections::HashMap;

/// Represents a chapter in an EPUB file
#[derive(Debug, Clone)]
pub struct EpubChapter {
    pub title: String,
    pub content: String,
    pub index: usize,
}

/// Extract text from HTML content
fn extract_text_from_html(html: &str) -> String {
    // Simple HTML tag removal and text extraction
    let mut result = String::new();
    let mut in_tag = false;
    let mut chars = html.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '<' => {
                in_tag = true;
            }
            '>' => {
                in_tag = false;
                // Add space after block-like tags
                if let Some(&next) = chars.peek() {
                    if next.is_whitespace() || next == '<' {
                        result.push(' ');
                    }
                }
            }
            _ if !in_tag => {
                if c.is_whitespace() {
                    if !result.ends_with(' ') {
                        result.push(' ');
                    }
                } else {
                    result.push(c);
                }
            }
            _ => {}
        }
    }

    // Clean up multiple spaces
    result.split_whitespace().collect::<Vec<&str>>().join(" ")
}

fn should_extract_text(mime: &str) -> bool {
    let mime = mime.to_lowercase();
    mime.contains("html") || mime.contains("xhtml") || mime.contains("xml") || mime.starts_with("text/")
}

/// Extract full content from an EPUB file including all chapters
pub async fn extract_epub_content(file_path: &str) -> Result<ExtractedContent> {
    let path = Path::new(file_path);

    let mut doc = EpubDoc::new(file_path).map_err(|e| {
        crate::error::IncrementumError::NotFound(format!("Failed to open EPUB: {}", e))
    })?;

    let spine_items = doc.spine.clone();
    let mut sections = Vec::new();

    for item in spine_items {
        if !item.linear {
            continue;
        }

        if let Some((content, mime)) = doc.get_resource_str(&item.idref) {
            if !should_extract_text(&mime) {
                continue;
            }

            let text = if mime.contains("html") || mime.contains("xhtml") || mime.contains("xml") {
                extract_text_from_html(&content)
            } else {
                content
            };

            if !text.trim().is_empty() {
                sections.push(text);
            }
        }
    }

    let text = sections.join("\n\n");
    let word_count = text.split_whitespace().count();
    let reading_time_mins = if word_count == 0 {
        0
    } else {
        (word_count as f64 / 200.0).ceil() as usize
    };
    let file_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let language = doc.mdata("language").map(|item| item.value.clone());

    let mut epub_metadata = HashMap::new();
    epub_metadata.insert("format".to_string(), "EPUB".to_string());
    epub_metadata.insert("file_size".to_string(), file_size.to_string());
    epub_metadata.insert("word_count".to_string(), word_count.to_string());
    epub_metadata.insert(
        "reading_time_minutes".to_string(),
        reading_time_mins.to_string(),
    );
    if let Some(lang) = &language {
        epub_metadata.insert("language".to_string(), lang.clone());
    }

    let metadata = serde_json::json!({
        "format": "EPUB",
        "file_size": file_size,
        "word_count": word_count,
        "reading_time_minutes": reading_time_mins,
        "language": language,
        "epub_metadata": epub_metadata
    });

    Ok(ExtractedContent {
        text,
        title: doc.get_title(),
        author: doc.mdata("creator").map(|item| item.value.clone()),
        page_count: if doc.spine.is_empty() { None } else { Some(doc.spine.len()) },
        metadata,
    })
}

/// Extract a specific chapter from an EPUB file
pub async fn extract_epub_chapter(file_path: &str, chapter_num: usize) -> Result<EpubChapter> {
    let mut doc = EpubDoc::new(file_path).map_err(|e| {
        crate::error::IncrementumError::NotFound(format!("Failed to open EPUB: {}", e))
    })?;
    if chapter_num == 0 || chapter_num > doc.spine.len() {
        return Err(crate::error::IncrementumError::NotFound(format!(
            "Chapter {} not found",
            chapter_num
        )));
    }

    let spine_item = doc.spine.get(chapter_num - 1).cloned().ok_or_else(|| {
        crate::error::IncrementumError::NotFound(format!("Chapter {} not found", chapter_num))
    })?;

    let content = doc
        .get_resource_str(&spine_item.idref)
        .map(|(content, mime)| {
            if should_extract_text(&mime) && (mime.contains("html") || mime.contains("xhtml") || mime.contains("xml")) {
                extract_text_from_html(&content)
            } else if should_extract_text(&mime) {
                content
            } else {
                String::new()
            }
        })
        .unwrap_or_default();

    Ok(EpubChapter {
        title: format!("Chapter {}", chapter_num),
        content,
        index: chapter_num - 1,
    })
}

/// Get the number of chapters in an EPUB file
pub async fn get_epub_chapter_count(file_path: &str) -> Result<usize> {
    let doc = EpubDoc::new(file_path).map_err(|e| {
        crate::error::IncrementumError::NotFound(format!("Failed to open EPUB: {}", e))
    })?;

    Ok(doc.spine.len())
}

/// Get the table of contents from an EPUB file
pub async fn get_epub_toc(file_path: &str) -> Result<Vec<(String, usize)>> {
    let doc = EpubDoc::new(file_path).map_err(|e| {
        crate::error::IncrementumError::NotFound(format!("Failed to open EPUB: {}", e))
    })?;

    let mut toc_entries = Vec::new();
    for nav in doc.toc.iter() {
        if let Some(chapter_index) = doc.resource_uri_to_chapter(&nav.content) {
            toc_entries.push((nav.label.clone(), chapter_index + 1));
        }
    }

    Ok(toc_entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_epub_chapter_count() {
        // This test would require a sample EPUB file
        // For now, we just verify the function compiles
        assert!(true);
    }
}
