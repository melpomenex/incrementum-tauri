//! Markdown content extraction

use crate::error::Result;
use crate::processor::ExtractedContent;
use std::path::Path;

pub async fn extract_markdown_content(file_path: &str) -> Result<ExtractedContent> {
    let path = Path::new(file_path);

    // Read the markdown file
    let content = match tokio::fs::read_to_string(path).await {
        Ok(c) => c,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to read markdown file: {}",
                e
            ))
            .into())
        }
    };

    // Extract title from first heading
    let title = extract_title_from_markdown(&content);

    // Count lines and estimate page count (assuming ~40 lines per page)
    let line_count = content.lines().count();
    let page_count = (line_count / 40).max(1);

    // Clean markdown syntax to get plain text
    let text = clean_markdown_text(&content);

    let metadata = serde_json::json!({
        "format": "Markdown",
        "line_count": line_count,
        "word_count": text.split_whitespace().count(),
    });

    Ok(ExtractedContent {
        text,
        title,
        author: None,
        page_count: Some(page_count),
        metadata,
    })
}

fn extract_title_from_markdown(content: &str) -> Option<String> {
    content
        .lines()
        .find(|line| line.starts_with('#'))
        .map(|line| {
            line.trim_start_matches('#')
                .trim()
                .to_string()
        })
}

fn clean_markdown_text(markdown: &str) -> String {
    let mut result = String::new();
    let mut lines = markdown.lines();

    while let Some(line) = lines.next() {
        let trimmed = line.trim();

        // Skip code blocks
        if trimmed.starts_with("```") {
            continue;
        }

        // Remove heading markers
        let clean_line = trimmed
            .trim_start_matches('#')
            .trim_start_matches('>')
            .trim_start_matches("- ")
            .trim_start_matches("* ")
            .trim_start_matches("+ ")
            .trim();

        // Remove markdown formatting
        let clean_line = clean_line
            .replace("**", "")
            .replace("*", "")
            .replace("__", "")
            .replace("_", "")
            .replace("`", "")
            .replace("~~", "")
            .replace("[]", "")
            .replace("()", "");

        // Skip empty lines and horizontal rules
        if clean_line.is_empty() || clean_line.chars().all(|c| c == '-' || c == '*') {
            if !result.is_empty() && !result.ends_with('\n') {
                result.push('\n');
            }
            continue;
        }

        result.push_str(&clean_line);
        result.push(' ');
    }

    // Clean up multiple spaces and newlines
    result
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}
