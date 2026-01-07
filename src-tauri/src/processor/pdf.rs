//! PDF content extraction

use crate::error::Result;
use crate::processor::ExtractedContent;
use std::path::Path;

pub async fn extract_pdf_content(file_path: &str) -> Result<ExtractedContent> {
    let path = Path::new(file_path);

    // Read the PDF file
    let buffer = match tokio::fs::read(path).await {
        Ok(b) => b,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to read PDF file: {}",
                e
            ))
            .into())
        }
    };

    // Extract text using pdf-extract
    let text = match pdf_extract::extract_text_from_mem(&buffer) {
        Ok(t) => t,
        Err(e) => {
            // If text extraction fails, return empty text with metadata
            eprintln!("PDF text extraction failed: {}", e);
            String::new()
        }
    };

    // Get metadata using lopdf
    let doc = match lopdf::Document::load_mem(&buffer) {
        Ok(d) => d,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to parse PDF for metadata: {}",
                e
            ))
            .into())
        }
    };

    let pages = doc.get_pages();
    let page_count = pages.len();

    // Try to extract title from PDF metadata
    let title = None; // TODO: Implement proper PDF metadata extraction
    let author = None;

    let metadata = serde_json::json!({
        "format": "PDF",
        "page_count": page_count,
        "encrypted": doc.is_encrypted(),
        "text_length": text.len(),
    });

    Ok(ExtractedContent {
        text,
        title,
        author,
        page_count: Some(page_count),
        metadata,
    })
}
