//! Anki package import functionality
//!
//! .apkg files are ZIP archives containing:
//! - collection.anki2 (SQLite database with notes, cards, revlog)
//! - media (JSON file mapping filenames to content)
//! - Actual media files

use std::io::{Read, Write};
use std::fs::File;
use std::path::Path;
use zip::ZipArchive;
use rusqlite::{Connection, Result as SqliteResult};
use serde_json::Value;
use crate::error::{Result, IncrementumError};

#[derive(Debug, serde::Serialize)]
pub struct AnkiNote {
    pub id: i64,
    pub guid: String,
    pub mid: i64,
    pub model_name: String,
    pub tags: Vec<String>,
    pub fields: Vec<AnkiField>,
    pub timestamp: i64,
}

#[derive(Debug, serde::Serialize)]
pub struct AnkiField {
    pub name: String,
    pub value: String,
}

#[derive(Debug, serde::Serialize)]
pub struct AnkiCard {
    pub id: i64,
    pub note_id: i64,
    pub ord: i64,
    pub interval: i32,
    pub ease: f64,
    pub due: i32,
}

#[derive(Debug, serde::Serialize)]
pub struct AnkiDeck {
    pub id: i64,
    pub name: String,
    pub notes: Vec<AnkiNote>,
    pub cards: Vec<AnkiCard>,
}

/// Parse an .apkg file and extract deck data
pub async fn parse_apkg(apkg_path: &str) -> Result<Vec<AnkiDeck>> {
    let file = File::open(apkg_path)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot open .apkg file: {}", e)))?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot unzip .apkg file: {}", e)))?;

    // Extract collection.anki2 to a temporary location
    let mut collection_file = archive.by_name("collection.anki2")
        .map_err(|e| IncrementumError::NotFound(format!("collection.anki2 not found in archive: {}", e)))?;

    let temp_db_path = std::env::temp_dir().join("anki_collection.anki2");
    let mut temp_file = File::create(&temp_db_path)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot create temp file: {}", e)))?;

    let mut buffer = Vec::new();
    collection_file.read_to_end(&mut buffer)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot read collection: {}", e)))?;
    temp_file.write_all(&buffer)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot write temp file: {}", e)))?;
    drop(temp_file);

    // Open SQLite database
    let conn = Connection::open(&temp_db_path)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot open database: {}", e)))?;

    // Extract models (note types)
    let mut models_stmt = conn.prepare("SELECT models FROM col")
        .map_err(|e| IncrementumError::NotFound(format!("Cannot prepare models query: {}", e)))?;
    let models_json: String = models_stmt.query_row([], |row| row.get(0))
        .map_err(|e| IncrementumError::NotFound(format!("Cannot get models: {}", e)))?;

    // Extract decks
    let mut decks_stmt = conn.prepare("SELECT decks FROM col")
        .map_err(|e| IncrementumError::NotFound(format!("Cannot prepare decks query: {}", e)))?;
    let decks_json: String = decks_stmt.query_row([], |row| row.get(0))
        .map_err(|e| IncrementumError::NotFound(format!("Cannot get decks: {}", e)))?;

    let decks_value: Value = serde_json::from_str(&decks_json)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot parse decks JSON: {}", e)))?;

    let models_value: Value = serde_json::from_str(&models_json)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot parse models JSON: {}", e)))?;

    let mut anki_decks = Vec::new();

    if let Some(decks_obj) = decks_value.as_object() {
        for (deck_id, deck_data) in decks_obj {
            if let Some(deck_obj) = deck_data.as_object() {
                let deck_name = deck_obj.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown Deck");

                let id = deck_id.parse::<i64>()
                    .unwrap_or(0);

                // Extract notes for this deck
                let notes = extract_notes_from_deck(&conn, id, &models_value)?;

                // Extract cards for this deck
                let cards = extract_cards_from_deck(&conn, id)?;

                anki_decks.push(AnkiDeck {
                    id,
                    name: deck_name.to_string(),
                    notes,
                    cards,
                });
            }
        }
    }

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_db_path);

    Ok(anki_decks)
}

fn extract_notes_from_deck(
    conn: &Connection,
    _deck_id: i64,
    models: &Value,
) -> Result<Vec<AnkiNote>> {
    let mut notes = Vec::new();

    let mut stmt = conn.prepare("SELECT id, guid, mid, tags, flds, mod FROM notes")
        .map_err(|e| IncrementumError::NotFound(format!("Cannot prepare notes query: {}", e)))?;

    let note_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, i64>(5)?,
        ))
    })
    .map_err(|e| IncrementumError::NotFound(format!("Cannot query notes: {}", e)))?;

    for note_row in note_rows {
        let (id, guid, mid, tags_str, fields_str, timestamp) = note_row
            .map_err(|e| IncrementumError::NotFound(format!("Cannot parse note row: {}", e)))?;

        // Get model name
        let model_name = models
            .get(&mid.to_string())
            .and_then(|v| v.as_object())
            .and_then(|o| o.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();

        // Parse tags
        let tags: Vec<String> = tags_str
            .split(' ')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();

        // Parse fields (separated by \x1f)
        let field_values: Vec<String> = fields_str
            .split('\x1f')
            .map(|s| s.to_string())
            .collect();

        // Get field names from model
        let field_names = get_model_field_names(models, mid);

        let fields: Vec<AnkiField> = field_names
            .into_iter()
            .enumerate()
            .map(|(idx, name)| AnkiField {
                name,
                value: field_values.get(idx).cloned().unwrap_or_default(),
            })
            .collect();

        notes.push(AnkiNote {
            id,
            guid,
            mid,
            model_name,
            tags,
            fields,
            timestamp,
        });
    }

    Ok(notes)
}

fn extract_cards_from_deck(conn: &Connection, _deck_id: i64) -> Result<Vec<AnkiCard>> {
    let mut cards = Vec::new();

    let mut stmt = conn.prepare("SELECT id, nid, ord, ivl, factor, due FROM cards")
        .map_err(|e| IncrementumError::NotFound(format!("Cannot prepare cards query: {}", e)))?;

    let card_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i32>(3)?,
            row.get::<_, i32>(4)?,
            row.get::<_, i32>(5)?,
        ))
    })
    .map_err(|e| IncrementumError::NotFound(format!("Cannot query cards: {}", e)))?;

    for card_row in card_rows {
        let (id, note_id, ord, interval, factor, due) = card_row
            .map_err(|e| IncrementumError::NotFound(format!("Cannot parse card row: {}", e)))?;

        cards.push(AnkiCard {
            id,
            note_id,
            ord,
            interval,
            ease: factor as f64 / 1000.0,
            due,
        });
    }

    Ok(cards)
}

fn get_model_field_names(models: &Value, model_id: i64) -> Vec<String> {
    models
        .get(&model_id.to_string())
        .and_then(|v| v.as_object())
        .and_then(|o| o.get("flds"))
        .and_then(|v| v.as_array())
        .map(|fields| {
            fields.iter()
                .filter_map(|f| f.as_object())
                .filter_map(|o| o.get("name"))
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
pub async fn import_anki_package(apkg_path: String) -> Result<String> {
    let decks = parse_apkg(&apkg_path).await?;

    let result = serde_json::to_value(&decks)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot serialize decks: {}", e)))?;

    Ok(result.to_string())
}

#[tauri::command]
pub fn validate_anki_package(path: String) -> Result<bool> {
    let file = File::open(&path)
        .map_err(|e| IncrementumError::NotFound(format!("Cannot open file: {}", e)))?;

    let archive = ZipArchive::new(file)
        .map_err(|e| IncrementumError::NotFound(format!("Not a valid .apkg file: {}", e)))?;

    // Check for collection.anki2
    let has_collection = archive.file_names().any(|name| name == "collection.anki2");

    if !has_collection {
        return Err(IncrementumError::NotFound("collection.anki2 not found in package".to_string()));
    }

    Ok(true)
}
