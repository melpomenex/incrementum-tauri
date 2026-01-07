//! HTML content extraction

use crate::error::Result;
use crate::processor::ExtractedContent;
use std::path::Path;

pub async fn extract_html_content(file_path: &str) -> Result<ExtractedContent> {
    let path = Path::new(file_path);

    // Read the HTML file
    let content = match tokio::fs::read_to_string(path).await {
        Ok(c) => c,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to read HTML file: {}",
                e
            ))
            .into())
        }
    };

    // Extract title from <title> tag
    let title = extract_title_from_html(&content);

    // Extract text content
    let text = extract_text_from_html(&content);

    // Estimate page count
    let word_count = text.split_whitespace().count();
    let page_count = (word_count / 300).max(1);

    let metadata = serde_json::json!({
        "format": "HTML",
        "word_count": word_count,
    });

    Ok(ExtractedContent {
        text,
        title,
        author: None,
        page_count: Some(page_count),
        metadata,
    })
}

fn extract_title_from_html(html: &str) -> Option<String> {
    let title_start = html.find("<title>")?;
    let title_end = html.find("</title>")?;

    if title_end > title_start {
        let title = &html[title_start + 7..title_end];
        Some(title.trim().to_string())
    } else {
        None
    }
}

fn extract_text_from_html(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    let mut in_script = false;
    let mut in_style = false;

    let mut chars = html.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '<' => {
                in_tag = true;

                // Check for script/style tags
                let mut tag_name = String::new();
                while let Some(&next) = chars.peek() {
                    if next.is_alphabetic() {
                        chars.next();
                        tag_name.push(next);
                    } else {
                        break;
                    }
                }

                let tag_lower = tag_name.to_lowercase();
                if tag_lower == "script" {
                    in_script = true;
                } else if tag_lower == "style" {
                    in_style = true;
                } else if tag_lower == "/script" {
                    in_script = false;
                } else if tag_lower == "/style" {
                    in_style = false;
                }
            }
            '>' => {
                in_tag = false;
            }
            _ if !in_tag && !in_script && !in_style => {
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

    // Clean up HTML entities
    result = result.replace("&nbsp;", " ");
    result = result.replace("&amp;", "&");
    result = result.replace("&lt;", "<");
    result = result.replace("&gt;", ">");
    result = result.replace("&quot;", "\"");
    result = result.replace("&#39;", "'");

    // Clean up multiple spaces
    result.split_whitespace().collect::<Vec<&str>>().join(" ")
}
