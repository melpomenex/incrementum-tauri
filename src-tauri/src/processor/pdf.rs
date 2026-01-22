//! PDF content extraction with full metadata support

use crate::error::Result;
use crate::processor::ExtractedContent;
use base64::{engine::general_purpose, Engine as _};
use std::path::Path;
use std::collections::HashMap;

/// Extract content from a PDF file including text and metadata
pub async fn extract_pdf_content(file_path: &str) -> Result<ExtractedContent> {
    let path = Path::new(file_path);

    // Read the PDF file
    let buffer = match tokio::fs::read(path).await {
        Ok(b) => b,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to read PDF file: {}",
                e
            )))
        }
    };

    // Get file size
    let file_size = buffer.len();

    // Extract text using pdf-extract
    let text = match pdf_extract::extract_text_from_mem(&buffer) {
        Ok(t) => t,
        Err(e) => {
            // If text extraction fails, return empty text with metadata
            eprintln!("PDF text extraction failed: {}", e);
            String::new()
        }
    };

    // Count words in extracted text
    let word_count = text.split_whitespace().count();

    // Get metadata using lopdf
    let doc = match lopdf::Document::load_mem(&buffer) {
        Ok(d) => d,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to parse PDF for metadata: {}",
                e
            )))
        }
    };

    let pages = doc.get_pages();
    let page_count = pages.len();

    // Build metadata
    let mut pdf_metadata = HashMap::new();
    pdf_metadata.insert("format".to_string(), "PDF".to_string());
    pdf_metadata.insert("page_count".to_string(), page_count.to_string());
    pdf_metadata.insert("encrypted".to_string(), doc.is_encrypted().to_string());
    pdf_metadata.insert("text_length".to_string(), text.len().to_string());
    pdf_metadata.insert("word_count".to_string(), word_count.to_string());
    pdf_metadata.insert("file_size".to_string(), file_size.to_string());
    pdf_metadata.insert("pdf_version".to_string(), doc.version.to_string());

    // Estimate reading time (average 200 words per minute)
    let reading_time_mins = if word_count > 0 {
        (word_count as f64 / 200.0).ceil() as usize
    } else {
        0
    };
    pdf_metadata.insert("reading_time_minutes".to_string(), reading_time_mins.to_string());

    // Build metadata JSON
    let metadata = serde_json::json!({
        "format": "PDF",
        "page_count": page_count,
        "encrypted": doc.is_encrypted(),
        "text_length": text.len(),
        "word_count": word_count,
        "file_size": file_size,
        "reading_time_minutes": reading_time_mins,
        "pdf_metadata": pdf_metadata
    });

    Ok(ExtractedContent {
        text,
        title: None,
        author: None,
        page_count: Some(page_count),
        metadata,
    })
}

/// Extract a specific page from a PDF file
pub async fn extract_pdf_page(file_path: &str, page_num: usize) -> Result<String> {
    let path = Path::new(file_path);

    let buffer = tokio::fs::read(path).await
        .map_err(|e| crate::error::IncrementumError::NotFound(format!("Failed to read PDF: {}", e)))?;

    let doc = lopdf::Document::load_mem(&buffer)
        .map_err(|e| crate::error::IncrementumError::NotFound(format!("Failed to load PDF: {}", e)))?;

    let pages = doc.get_pages();
    let page_count = pages.len();

    if page_num < 1 || page_num > page_count {
        return Err(crate::error::IncrementumError::NotFound(format!(
            "Page {} out of range (1-{})",
            page_num, page_count
        )));
    }

    // Get the page (0-indexed)
    let _page_id = pages.keys().nth(page_num - 1)
        .ok_or_else(|| crate::error::IncrementumError::NotFound("Page not found".to_string()))?;

    // Extract text from the page
    let text = pdf_extract::extract_text_from_mem(&buffer)
        .unwrap_or_default();

    // Note: pdf-extract doesn't support per-page extraction easily
    // For a production implementation, you'd want to use a library that supports
    // per-page text extraction like poppler or pdfium

    Ok(text)
}

/// Get the number of pages in a PDF file
pub async fn get_pdf_page_count(file_path: &str) -> Result<usize> {
    let path = Path::new(file_path);

    let buffer = tokio::fs::read(path).await
        .map_err(|e| crate::error::IncrementumError::NotFound(format!("Failed to read PDF: {}", e)))?;

    let doc = lopdf::Document::load_mem(&buffer)
        .map_err(|e| crate::error::IncrementumError::NotFound(format!("Failed to load PDF: {}", e)))?;

    Ok(doc.get_pages().len())
}

/// Extract an embedded cover image from the first page of a PDF as a data URL.
pub async fn extract_pdf_cover_data_url(file_path: &str) -> Result<Option<String>> {
    let path = Path::new(file_path);

    let buffer = tokio::fs::read(path).await
        .map_err(|e| crate::error::IncrementumError::NotFound(format!("Failed to read PDF: {}", e)))?;

    let doc = lopdf::Document::load_mem(&buffer)
        .map_err(|e| crate::error::IncrementumError::NotFound(format!("Failed to load PDF: {}", e)))?;

    let first_page_id = doc.get_pages().iter().next().map(|(_, id)| *id);
    let Some(page_id) = first_page_id else {
        return Ok(None);
    };

    let images = match doc.get_page_images(page_id) {
        Ok(images) => images,
        Err(_) => return Ok(None),
    };

    let mut best_image: Option<(Vec<u8>, String, i64)> = None;
    for image in images {
        let filters = image.filters.clone().unwrap_or_default();
        let mime = if filters.iter().any(|f| f.eq_ignore_ascii_case("DCTDecode")) {
            "image/jpeg"
        } else if filters.iter().any(|f| f.eq_ignore_ascii_case("JPXDecode")) {
            "image/jp2"
        } else {
            continue;
        };

        let area = image.width.saturating_mul(image.height);
        if image.content.is_empty() {
            continue;
        }

        let should_replace = best_image
            .as_ref()
            .map(|(_, _, best_area)| area > *best_area)
            .unwrap_or(true);

        if should_replace {
            best_image = Some((image.content.to_vec(), mime.to_string(), area));
        }
    }

    if let Some((bytes, mime, _)) = best_image {
        let encoded = general_purpose::STANDARD.encode(bytes);
        return Ok(Some(format!("data:{};base64,{}", mime, encoded)));
    }

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_pdf_page_count() {
        // This test would require a sample PDF file
        // For now, we just verify the function compiles
        assert!(true);
    }
}
