//! Segmentation commands

use tauri::State;
use crate::database::Repository;
use crate::error::Result;
use crate::segmentation::{DocumentSegmenter, SegmentConfig, SegmentationMethod, SegmentationResult};

/// Segment a document into extracts
#[tauri::command]
pub async fn segment_document(
    document_id: String,
    method: String,
    target_length: usize,
    overlap: usize,
    repo: State<'_, Repository>,
) -> Result<SegmentationResult> {
    // Get the document
    let doc = repo.get_document(&document_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound("Document not found".to_string()))?;

    let content = doc.content.unwrap_or_default();
    if content.is_empty() {
        return Err(crate::error::IncrementumError::Internal("Document has no content".to_string()));
    }

    // Parse method
    let segmentation_method = match method.as_str() {
        "semantic" => SegmentationMethod::Semantic,
        "paragraph" => SegmentationMethod::Paragraph,
        "fixed" => SegmentationMethod::Fixed,
        "smart" => SegmentationMethod::Smart,
        _ => SegmentationMethod::Smart,
    };

    let config = SegmentConfig {
        method: segmentation_method,
        target_length,
        overlap,
        min_length: 50,
        max_length: 1000,
    };

    let segmenter = DocumentSegmenter::new(config);
    let result = segmenter.segment(&content)?;

    Ok(result)
}

/// Auto-segment and create extracts from document
#[tauri::command]
pub async fn auto_segment_and_create_extracts(
    document_id: String,
    repo: State<'_, Repository>,
) -> Result<Vec<String>> {
    // Get the document
    let doc = repo.get_document(&document_id).await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound("Document not found".to_string()))?;

    let content = doc.content.unwrap_or_default();
    if content.is_empty() {
        return Err(crate::error::IncrementumError::Internal("Document has no content".to_string()));
    }

    // Use smart segmentation
    let config = SegmentConfig::default();
    let segmenter = DocumentSegmenter::new(config);
    let result = segmenter.segment(&content)?;

    // Create extracts from segments
    let mut extract_ids = Vec::new();

    for segment in result.segments {
        let extract_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO extracts (id, document_id, content, page_title, date_created, date_modified)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
        )
        .bind(&extract_id)
        .bind(&document_id)
        .bind(&segment.content)
        .bind(&segment.chapter_title)
        .bind(&now)
        .bind(&now)
        .execute(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to create extract: {}", e)))?;

        extract_ids.push(extract_id);
    }

    Ok(extract_ids)
}

/// Get segmentation preview (first N segments)
#[tauri::command]
pub async fn preview_segmentation(
    content: String,
    method: String,
    target_length: usize,
    overlap: usize,
    max_segments: usize,
) -> Result<SegmentationResult> {
    let segmentation_method = match method.as_str() {
        "semantic" => SegmentationMethod::Semantic,
        "paragraph" => SegmentationMethod::Paragraph,
        "fixed" => SegmentationMethod::Fixed,
        "smart" => SegmentationMethod::Smart,
        _ => SegmentationMethod::Smart,
    };

    let config = SegmentConfig {
        method: segmentation_method,
        target_length,
        overlap,
        min_length: 50,
        max_length: 1000,
    };

    let segmenter = DocumentSegmenter::new(config);
    let mut result = segmenter.segment(&content)?;

    // Limit segments for preview
    if result.segments.len() > max_segments {
        result.segments.truncate(max_segments);
        result.segment_count = max_segments;
    }

    Ok(result)
}

/// Extract key points from text
#[tauri::command]
pub async fn extract_key_points_from_text(
    text: String,
    max_points: usize,
) -> Result<Vec<String>> {
    crate::segmentation::extract_key_points(&text, max_points).await
}

/// Batch segment multiple documents
#[tauri::command]
pub async fn batch_segment_documents(
    document_ids: Vec<String>,
    method: String,
    target_length: usize,
    overlap: usize,
    repo: State<'_, Repository>,
) -> Result<Vec<(String, SegmentationResult)>> {
    let mut results = Vec::new();

    for doc_id in document_ids {
        match segment_document(
            doc_id.clone(),
            method.clone(),
            target_length,
            overlap,
            repo.clone(),
        )
        .await
        {
            Ok(result) => {
                results.push((doc_id, result));
            }
            Err(e) => {
                eprintln!("Failed to segment document {}: {}", doc_id, e);
                // Continue with other documents
            }
        }
    }

    Ok(results)
}

/// Get recommended segmentation settings for document type
#[tauri::command]
pub async fn get_recommended_segmentation(
    file_type: String,
    content_length: usize,
) -> Result<SegmentConfig> {
    let (method, target_length, overlap) = match file_type.as_str() {
        "pdf" => {
            // PDFs often have clear page/section boundaries
            (SegmentationMethod::Smart, 300, 30)
        }
        "epub" => {
            // EPUBs have chapter structure
            (SegmentationMethod::Paragraph, 400, 0)
        }
        "markdown" => {
            // Markdown has headers
            (SegmentationMethod::Smart, 250, 20)
        }
        _ => {
            // Default: adaptive based on length
            if content_length < 5000 {
                (SegmentationMethod::Paragraph, 200, 0)
            } else if content_length < 50000 {
                (SegmentationMethod::Smart, 300, 30)
            } else {
                (SegmentationMethod::Fixed, 400, 50)
            }
        }
    };

    Ok(SegmentConfig {
        method,
        target_length,
        overlap,
        min_length: 50,
        max_length: 1000,
    })
}
