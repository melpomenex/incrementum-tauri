//! Collections commands for organizing documents

use crate::models::collection::{Collection, CollectionType, DocumentCollection, SmartCollectionFilter};
use std::sync::Arc;

#[tauri::command]
pub async fn create_collection(
    name: String,
    collection_type: String,
    filter_query: Option<String>,
    icon: Option<String>,
    color: Option<String>,
) -> Result<Collection, String> {
    let collection_type_enum = CollectionType::from_str(&collection_type)
        .ok_or_else(|| format!("Invalid collection type: {}", collection_type))?;

    let mut collection = Collection::new(name);
    collection.collection_type = collection_type_enum;
    collection.filter_query = filter_query;
    collection.icon = icon;
    collection.color = color;

    // TODO: Save to database
    Ok(collection)
}

#[tauri::command]
pub async fn get_collections() -> Result<Vec<Collection>, String> {
    // TODO: Fetch from database
    // Return default collections for now
    Ok(vec![
        Collection::to_read(),
        Collection::in_progress(),
        Collection::completed(),
        Collection::favorites(),
        Collection::recent(),
    ])
}

#[tauri::command]
pub async fn get_collection(id: String) -> Result<Collection, String> {
    // TODO: Fetch from database
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn update_collection(
    id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    filter_query: Option<String>,
) -> Result<Collection, String> {
    // TODO: Update in database
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn delete_collection(id: String) -> Result<(), String> {
    // TODO: Delete from database
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn add_document_to_collection(
    document_id: String,
    collection_id: String,
) -> Result<(), String> {
    // TODO: Add document_collection record to database
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn remove_document_from_collection(
    document_id: String,
    collection_id: String,
) -> Result<(), String> {
    // TODO: Remove document_collection record from database
    Err("Not implemented".to_string())
}

#[tauri::command]
pub async fn get_collection_documents(collection_id: String) -> Result<Vec<String>, String> {
    // TODO: Fetch document IDs for this collection
    // For smart collections, run the filter query
    Ok(vec![])
}

#[tauri::command]
pub async fn get_document_collections(document_id: String) -> Result<Vec<Collection>, String> {
    // TODO: Fetch all collections containing this document
    Ok(vec![])
}

#[tauri::command]
pub async fn get_smart_collection_preview(
    filter_query: String,
) -> Result<Vec<String>, String> {
    // TODO: Run the filter query and return matching document IDs
    Ok(vec![])
}

#[tauri::command]
pub async fn reorder_collections(
    collection_ids: Vec<String>,
) -> Result<(), String> {
    // TODO: Update sort order for collections
    Err("Not implemented".to_string())
}
