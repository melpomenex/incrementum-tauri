//! EPUB content extraction

use crate::error::Result;
use crate::processor::ExtractedContent;
use std::path::Path;

pub async fn extract_epub_content(file_path: &str) -> Result<ExtractedContent> {
    let path = Path::new(file_path);

    // Open the EPUB file
    let mut doc = match epub::doc::EpubDoc::new(path) {
        Ok(d) => d,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to open EPUB: {}",
                e
            ))
            .into())
        }
    };

    // Get metadata - iterate through metadata items
    let title = doc.metadata.iter()
        .find(|item| item.property == "title")
        .and_then(|item| Some(item.value.as_str()))
        .map(String::from);

    let author = doc.metadata.iter()
        .find(|item| item.property == "creator")
        .and_then(|item| Some(item.value.as_str()))
        .map(String::from);

    // Get the spine count (number of chapters)
    let spine_count = doc.spine.len();
    let chapter_count = spine_count;

    // For now, extract minimal text
    let text = String::new();

    let metadata = serde_json::json!({
        "format": "EPUB",
        "chapter_count": chapter_count,
        "spine_count": spine_count,
    });

    Ok(ExtractedContent {
        text,
        title,
        author,
        page_count: Some(chapter_count),
        metadata,
    })
}

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
