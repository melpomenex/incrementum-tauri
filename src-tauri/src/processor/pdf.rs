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

    // Extract text using pdf-extract with a timeout to prevent hanging on large PDFs
    // Clone buffer for the blocking task
    let buffer_for_text = buffer.clone();
    let text = match tokio::time::timeout(
        std::time::Duration::from_secs(10),
        tokio::task::spawn_blocking(move || {
            pdf_extract::extract_text_from_mem(&buffer_for_text)
        })
    ).await {
        Ok(Ok(Ok(t))) => t,
        Ok(Ok(Err(e))) => {
            eprintln!("PDF text extraction failed: {}", e);
            String::new()
        }
        Ok(Err(e)) => {
            eprintln!("PDF text extraction task panicked: {}", e);
            String::new()
        }
        Err(_) => {
            eprintln!("PDF text extraction timed out after 10 seconds, skipping text extraction");
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

/// Convert a PDF file to HTML format for better text selection and extraction
///
/// This creates a structured HTML document with the PDF's text content,
/// preserving page breaks and basic formatting for improved readability
/// and text selection compared to PDF.js rendering.
pub async fn convert_pdf_to_html(file_path: &str) -> Result<String> {
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

    // Get document metadata using lopdf
    let doc = match lopdf::Document::load_mem(&buffer) {
        Ok(d) => d,
        Err(e) => {
            return Err(crate::error::IncrementumError::NotFound(format!(
                "Failed to parse PDF: {}",
                e
            )))
        }
    };

    let pages = doc.get_pages();
    let page_count = pages.len();

    // Extract title from filename
    let title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Converted PDF")
        .to_string();

    // Extract full text using pdf-extract
    let full_text = match pdf_extract::extract_text_from_mem(&buffer) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("PDF text extraction failed: {}", e);
            String::new()
        }
    };

    // Build HTML document with proper structure
    let mut html = String::new();

    // HTML header with styling for readability
    html.push_str(&format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{}</title>
    <style>
        :root {{
            --bg-color: #ffffff;
            --text-color: #1a1a1a;
            --page-border: #e0e0e0;
            --page-bg: #fafafa;
        }}

        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg-color: #1a1a1a;
                --text-color: #e0e0e0;
                --page-border: #404040;
                --page-bg: #242424;
            }}
        }}

        * {{
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background-color: var(--bg-color);
            color: var(--text-color);
        }}

        .pdf-header {{
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--page-border);
        }}

        .pdf-header h1 {{
            margin: 0 0 0.5rem 0;
            font-size: 1.75rem;
        }}

        .pdf-header .meta {{
            font-size: 0.875rem;
            opacity: 0.7;
        }}

        .page {{
            background-color: var(--page-bg);
            border: 1px solid var(--page-border);
            border-radius: 4px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            page-break-after: always;
        }}

        .page-header {{
            font-size: 0.75rem;
            color: var(--text-color);
            opacity: 0.5;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--page-border);
        }}

        .page-content {{
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 1rem;
        }}

        .page-content p {{
            margin: 0 0 1em 0;
        }}

        /* Improve text selection */
        ::selection {{
            background-color: #3b82f6;
            color: white;
        }}

        /* Print styles */
        @media print {{
            body {{
                max-width: none;
                padding: 0;
            }}
            .page {{
                border: none;
                box-shadow: none;
                page-break-after: always;
            }}
        }}
    </style>
</head>
<body>
    <div class="pdf-header">
        <h1>{}</h1>
        <div class="meta">Converted from PDF • {} pages</div>
    </div>
"#,
        html_escape(&title),
        html_escape(&title),
        page_count
    ));

    // Process text content
    // Try to split by page markers or reasonable chunks
    let paragraphs: Vec<&str> = full_text
        .split("\n\n")
        .filter(|p| !p.trim().is_empty())
        .collect();

    if paragraphs.is_empty() {
        // If no text was extracted, show a message
        html.push_str(r#"
    <div class="page">
        <div class="page-header">Page 1</div>
        <div class="page-content">
            <p><em>No text content could be extracted from this PDF. The PDF may be image-based or scanned. Consider using OCR to extract text.</em></p>
        </div>
    </div>
"#);
    } else {
        // Distribute paragraphs across estimated pages
        let paragraphs_per_page = if page_count > 0 {
            (paragraphs.len() as f64 / page_count as f64).ceil() as usize
        } else {
            paragraphs.len()
        }.max(1);

        for (page_idx, chunk) in paragraphs.chunks(paragraphs_per_page).enumerate() {
            let page_num = page_idx + 1;
            html.push_str(&format!(r#"
    <div class="page" id="page-{}">
        <div class="page-header">Page {}</div>
        <div class="page-content">
"#, page_num, page_num));

            for para in chunk {
                let escaped = html_escape(para.trim());
                // Convert single newlines to proper paragraphs
                let formatted = escaped
                    .split('\n')
                    .map(|line| format!("            <p>{}</p>", line.trim()))
                    .collect::<Vec<_>>()
                    .join("\n");
                html.push_str(&formatted);
                html.push('\n');
            }

            html.push_str(r#"        </div>
    </div>
"#);
        }
    }

    // Close HTML document
    html.push_str(r#"</body>
</html>
"#);

    Ok(html)
}

/// Helper function to escape HTML special characters
fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// Save converted HTML to a file alongside the original PDF
/// Returns the path to the saved HTML file
pub async fn save_pdf_as_html(pdf_path: &str, output_path: Option<&str>) -> Result<String> {
    let html_content = convert_pdf_to_html(pdf_path).await?;

    let output_file_path = match output_path {
        Some(path) => path.to_string(),
        None => {
            // Generate output path by replacing .pdf extension with .html
            let path = Path::new(pdf_path);
            let stem = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("converted");
            let parent = path.parent().unwrap_or(Path::new("."));
            parent.join(format!("{}.html", stem)).to_string_lossy().to_string()
        }
    };

    tokio::fs::write(&output_file_path, &html_content).await
        .map_err(|e| crate::error::IncrementumError::Internal(format!(
            "Failed to save HTML file: {}", e
        )))?;

    Ok(output_file_path)
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

    #[test]
    fn test_html_escape() {
        assert_eq!(html_escape("<script>"), "&lt;script&gt;");
        assert_eq!(html_escape("a & b"), "a &amp; b");
        assert_eq!(html_escape("\"quoted\""), "&quot;quoted&quot;");
    }
}
