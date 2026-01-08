//! SuperMemo import functionality
//!
//! SuperMemo exports are typically ZIP archives containing:
//! - XML files with items, topics, and learning data
//! - Media files (images, audio, video)
//! - Registry files with metadata

use std::io::Read;
use std::fs::File;
use zip::ZipArchive;
use crate::error::{Result, IncrementumError};

#[derive(Debug, serde::Serialize)]
pub struct SuperMemoItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub question: Option<String>,
    pub answer: Option<String>,
    pub topic: Option<String>,
    pub interval: Option<i32>,
    pub repetitions: Option<i32>,
    pub easiness: Option<f64>,
    pub timestamp: i64,
}

#[derive(Debug, serde::Serialize)]
pub struct SuperMemoCollection {
    pub name: String,
    pub items: Vec<SuperMemoItem>,
    pub topics: Vec<String>,
    pub media: Vec<String>,
}

/// Parse a SuperMemo export (ZIP archive)
pub async fn parse_supermemo_export(zip_path: &str) -> Result<SuperMemoCollection> {
    let file = File::open(zip_path)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot open SuperMemo export: {}", e)))?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot unzip export: {}", e)))?;

    let mut collection = SuperMemoCollection {
        name: "SuperMemo Collection".to_string(),
        items: Vec::new(),
        topics: Vec::new(),
        media: Vec::new(),
    };

    // Process all files in the archive
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| IncrementumError::NotFound(format!("Cannot read file: {}", e)))?;

        let file_name = file.name().to_string();

        // Skip media files for now
        if file_name.ends_with(".png") ||
           file_name.ends_with(".jpg") ||
           file_name.ends_with(".jpeg") ||
           file_name.ends_with(".gif") ||
           file_name.ends_with(".mp3") ||
           file_name.ends_with(".wav") ||
           file_name.ends_with(".mp4") {
            collection.media.push(file_name);
            continue;
        }

        // Process XML files
        if file_name.ends_with(".xml") {
            let mut content = String::new();
            file.read_to_string(&mut content)
                .map_err(|e| IncrementumError::NotFound(format!("Cannot read XML: {}", e)))?;

            // Parse SuperMemo XML format
            if let Ok(items) = parse_supermemo_xml(&content, &file_name) {
                collection.items.extend(items);
            }
        }
    }

    // Extract unique topics
    let mut topics_set = std::collections::HashSet::new();
    for item in &collection.items {
        if let Some(topic) = &item.topic {
            topics_set.insert(topic.clone());
        }
    }
    collection.topics = topics_set.into_iter().collect();

    Ok(collection)
}

/// Parse SuperMemo XML content
fn parse_supermemo_xml(content: &str, source_file: &str) -> Result<Vec<SuperMemoItem>> {
    let mut items: Vec<SuperMemoItem> = Vec::new();

    // SuperMemo uses various XML formats depending on version
    // Try to detect and parse the format

    // Simple Q&A format detection
    if content.contains("<SuperMemo>") ||
       content.contains("<Element>") ||
       content.contains("<Question>") {
        return parse_supermemo_qa_xml(content);
    }

    // Topic/content format
    if content.contains("<Topic>") || content.contains("<Content>") {
        return parse_supermemo_topic_xml(content);
    }

    // If no known format, try generic parsing
    parse_generic_supermemo_xml(content, source_file)
}

/// Parse SuperMemo Q&A XML format
fn parse_supermemo_qa_xml(content: &str) -> Result<Vec<SuperMemoItem>> {
    let mut items = Vec::new();

    // Simple XML parsing for Q&A format
    // Format: <Element><Question>...</Question><Answer>...</Answer></Element>

    let element_start = "<Element>";
    let element_end = "</Element>";
    let question_start = "<Question>";
    let question_end = "</Question>";
    let answer_start = "<Answer>";
    let answer_end = "</Answer>";
    let title_start = "<Title>";
    let title_end = "</Title>";

    let mut pos = 0;
    let mut item_count = 0;

    while pos < content.len() {
        // Find next element
        if let Some(element_start_pos) = content[pos..].find(element_start) {
            let element_start = pos + element_start_pos + element_start.len();

            // Find element end
            if let Some(element_end_pos) = content[element_start..].find(element_end) {
                let element_end = element_start + element_end_pos;
                let element_content = &content[element_start..element_end];

                // Extract question
                let question = extract_xml_tag(element_content, "Question");
                let answer = extract_xml_tag(element_content, "Answer");
                let title = extract_xml_tag(element_content, "Title");

                // Extract learning data
                let interval = extract_xml_tag(element_content, "Interval")
                    .and_then(|s| s.parse::<i32>().ok());
                let repetitions = extract_xml_tag(element_content, "Repetitions")
                    .and_then(|s| s.parse::<i32>().ok());
                let easiness = extract_xml_tag(element_content, "Easiness")
                    .and_then(|s| s.parse::<f64>().ok());

                items.push(SuperMemoItem {
                    id: format!("sm-{}", item_count),
                    title: title.unwrap_or_else(|| {
                        question.as_ref()
                            .unwrap_or(&"Untitled".to_string())
                            .chars()
                            .take(50)
                            .collect()
                    }),
                    content: format!(
                        "{}\n\n{}",
                        question.as_ref().unwrap_or(&String::new()),
                        answer.as_ref().unwrap_or(&String::new())
                    ),
                    question,
                    answer,
                    topic: None,
                    interval,
                    repetitions,
                    easiness,
                    timestamp: chrono::Utc::now().timestamp(),
                });

                item_count += 1;
                pos = element_end + "</Element>".len(); // Move past closing tag
            } else {
                break;
            }
        } else {
            break;
        }
    }

    Ok(items)
}

/// Parse SuperMemo topic XML format
fn parse_supermemo_topic_xml(content: &str) -> Result<Vec<SuperMemoItem>> {
    let mut items = Vec::new();

    // Topic format: <Topic><Title>...</Title><Content>...</Content></Topic>

    let topic_start = "<Topic>";
    let topic_end = "</Topic>";

    let mut pos = 0;
    let mut item_count = 0;

    while pos < content.len() {
        if let Some(topic_start_pos) = content[pos..].find(topic_start) {
            let topic_start = pos + topic_start_pos + topic_start.len();

            if let Some(topic_end_pos) = content[topic_start..].find(topic_end) {
                let topic_end = topic_start + topic_end_pos;
                let topic_content = &content[topic_start..topic_end];

                let title = extract_xml_tag(topic_content, "Title")
                    .unwrap_or_else(|| "Untitled Topic".to_string());
                let content_text = extract_xml_tag(topic_content, "Content")
                    .unwrap_or_else(|| String::new());

                items.push(SuperMemoItem {
                    id: format!("sm-topic-{}", item_count),
                    title: title.clone(),
                    content: content_text,
                    question: None,
                    answer: None,
                    topic: Some(title),
                    interval: None,
                    repetitions: None,
                    easiness: None,
                    timestamp: chrono::Utc::now().timestamp(),
                });

                item_count += 1;
                pos = topic_end + "</Topic>".len(); // Move past closing tag
            } else {
                break;
            }
        } else {
            break;
        }
    }

    Ok(items)
}

/// Parse generic SuperMemo XML
fn parse_generic_supermemo_xml(content: &str, source_file: &str) -> Result<Vec<SuperMemoItem>> {
    let mut items = Vec::new();

    // Try to extract any text content and create items
    // This is a fallback for unknown formats

    // Remove XML tags
    let text_content = content
        .lines()
        .filter(|line| !line.trim().starts_with('<') && !line.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    if !text_content.trim().is_empty() {
        items.push(SuperMemoItem {
            id: format!("sm-generic-{}", source_file.replace("/", "-")),
            title: source_file.split('/').last().unwrap_or("Imported").to_string(),
            content: text_content,
            question: None,
            answer: None,
            topic: None,
            interval: None,
            repetitions: None,
            easiness: None,
            timestamp: chrono::Utc::now().timestamp(),
        });
    }

    Ok(items)
}

/// Extract content between XML tags
fn extract_xml_tag(content: &str, tag: &str) -> Option<String> {
    let start_tag = format!("<{}>", tag);
    let end_tag = format!("</{}>", tag);

    if let Some(start_pos) = content.find(&start_tag) {
        let content_start = start_pos + start_tag.len();

        if let Some(end_pos) = content[content_start..].find(&end_tag) {
            let extracted = &content[content_start..content_start + end_pos];
            return Some(extracted.trim().to_string());
        }
    }

    // Try self-closing tag
    let self_closing_tag = format!("<{}/>", tag);
    if let Some(pos) = content.find(&self_closing_tag) {
        return Some(String::new());
    }

    None
}

#[tauri::command]
pub async fn import_supermemo_package(zip_path: String) -> Result<String> {
    let collection = parse_supermemo_export(&zip_path).await?;

    let result = serde_json::to_value(&collection)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot serialize collection: {}", e)))?;

    Ok(result.to_string())
}

#[tauri::command]
pub fn validate_supermemo_package(path: String) -> Result<bool> {
    let file = File::open(&path)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot open file: {}", e)))?;

    let archive = ZipArchive::new(file)
        .map_err(|e| IncrementumError::NotFound(format!("Not a valid ZIP archive: {}", e)))?;

    // Check for XML files (SuperMemo exports contain XML)
    let has_xml = archive.file_names().any(|name| name.ends_with(".xml"));

    if !has_xml {
        return Err(IncrementumError::NotFound("No XML files found in export".to_string()));
    }

    Ok(true)
}
