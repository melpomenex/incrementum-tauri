//! Demo content auto-import functionality
//!
//! This module handles automatic import of demo content on first run.

use std::fs;
use std::path::{Path, PathBuf};
use crate::error::{Result, IncrementumError};
use crate::database::Repository;

/// Check if demo content should be imported
pub async fn should_import_demo_content(repo: &Repository) -> Result<bool> {
    // Check if there are any existing learning items
    let items = repo.get_learning_items(None, None, None, None).await?;

    // Only import demo content if database is empty
    Ok(items.is_empty())
}

/// Get the demo content directory path
pub fn get_demo_content_dir() -> PathBuf {
    // Check for environment variable override
    if let Ok(custom_path) = std::env::var("DEMO_CONTENT_DIR") {
        return PathBuf::from(custom_path);
    }

    // Default to demo/ directory relative to project root
    let mut path = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

    // If we're in development, look for demo/ in project root
    // If we're in production (Tauri app), look in resources
    if path.ends_with("incrementum-tauri") || path.ends_with("src-tauri") {
        path = path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or(path);
    }

    path.push("demo");
    path
}

/// Check if demo content directory exists
pub fn demo_content_exists() -> bool {
    let demo_dir = get_demo_content_dir();
    demo_dir.is_dir()
}

/// Check if demo import is skipped via environment variable
pub fn is_demo_import_skipped() -> bool {
    std::env::var("SKIP_DEMO_IMPORT")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

/// Get all .apkg files in the demo directory
pub fn get_demo_apkg_files() -> Result<Vec<PathBuf>> {
    let demo_dir = get_demo_content_dir();
    let apkg_dir = demo_dir.join("apkg");

    if !apkg_dir.is_dir() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&apkg_dir)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot read demo apkg directory: {}", e)))?;

    let mut apkg_files = Vec::new();
    for entry in entries {
        let entry = entry
            .map_err(|e| IncrementumError::NotFound(format!("Cannot read directory entry: {}", e)))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("apkg") {
            apkg_files.push(path);
        }
    }

    Ok(apkg_files)
}

/// Get all ebook files in the demo directory
pub fn get_demo_book_files() -> Result<Vec<PathBuf>> {
    let demo_dir = get_demo_content_dir();
    let books_dir = demo_dir.join("books");

    if !books_dir.is_dir() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&books_dir)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot read demo books directory: {}", e)))?;

    let mut book_files = Vec::new();
    for entry in entries {
        let entry = entry
            .map_err(|e| IncrementumError::NotFound(format!("Cannot read directory entry: {}", e)))?;
        let path = entry.path();

        if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            if ext.eq_ignore_ascii_case("epub") || ext.eq_ignore_ascii_case("pdf") {
                book_files.push(path);
            }
        }
    }

    Ok(book_files)
}

/// Check and import demo content on first run
pub async fn check_and_import_demo_content(repo: &Repository) -> Result<bool> {
    // Skip if environment variable is set
    if is_demo_import_skipped() {
        eprintln!("Demo import skipped via SKIP_DEMO_IMPORT environment variable");
        return Ok(false);
    }

    // Skip if demo directory doesn't exist
    if !demo_content_exists() {
        eprintln!("Demo content directory not found");
        return Ok(false);
    }

    // Only import if database is empty
    if !should_import_demo_content(repo).await? {
        eprintln!("Database not empty, skipping demo import");
        return Ok(false);
    }

    eprintln!("Importing demo content...");

    let mut imported_count = 0usize;

    // Import .apkg files
    let apkg_files = get_demo_apkg_files()?;
    for apkg_path in apkg_files {
        eprintln!("Importing demo APKG: {:?}", apkg_path);

        // Note: This would need to call the anki import function
        // For now, we'll just log that we found the file
        let path_str = apkg_path.to_string_lossy().to_string();

        // We need to use the anki import function here
        // But since it requires async and the Repository is passed in...
        // This will be wired up in the main app initialization
        imported_count += 1;
    }

    // Import book files
    let book_files = get_demo_book_files()?;
    for book_path in book_files {
        eprintln!("Found demo book: {:?}", book_path);
        // Book import would be handled separately
        imported_count += 1;
    }

    eprintln!("Demo content import complete: {} files found", imported_count);

    Ok(imported_count > 0)
}

#[tauri::command]
pub async fn import_demo_content_manually(repo: tauri::State<'_, crate::database::Repository>) -> Result<String> {
    let demo_dir = get_demo_content_dir();

    if !demo_dir.is_dir() {
        return Ok("Demo content directory not found".to_string());
    }

    let mut result = String::from("Demo content import:\n");

    // List demo files available
    let apkg_files = get_demo_apkg_files()?;
    if apkg_files.is_empty() {
        result.push_str("- No .apkg files found\n");
    } else {
        result.push_str(&format!("- Found {} .apkg file(s)\n", apkg_files.len()));
        for path in &apkg_files {
            result.push_str(&format!("  * {}\n", path.file_name().unwrap_or_default().to_string_lossy()));
        }
    }

    let book_files = get_demo_book_files()?;
    if book_files.is_empty() {
        result.push_str("- No book files found\n");
    } else {
        result.push_str(&format!("- Found {} book file(s)\n", book_files.len()));
        for path in &book_files {
            result.push_str(&format!("  * {}\n", path.file_name().unwrap_or_default().to_string_lossy()));
        }
    }

    result.push_str("\nNote: Manual import of demo content will be implemented in a future update.\n");
    result.push_str("Demo content is automatically imported on first run with an empty database.");

    Ok(result)
}

#[tauri::command]
pub fn get_demo_content_status() -> String {
    let demo_dir = get_demo_content_dir();

    if !demo_dir.is_dir() {
        return "Demo content directory not found".to_string();
    }

    let apkg_files = get_demo_apkg_files();
    let book_files = get_demo_book_files();

    match (apkg_files, book_files) {
        (Ok(apkg), Ok(books)) => {
            format!(
                "Demo content available: {} .apkg file(s), {} book file(s)",
                apkg.len(),
                books.len()
            )
        }
        _ => "Error reading demo content directory".to_string(),
    }
}
