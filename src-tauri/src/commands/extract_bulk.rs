//! Bulk extract operations

use tauri::State;
use crate::database::Repository;
use crate::error::Result;

#[derive(Clone, serde::Serialize)]
pub struct BulkOperationResult {
    pub succeeded: Vec<String>,
    pub failed: Vec<String>,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn bulk_delete_extracts(
    extract_ids: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<BulkOperationResult> {
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();
    let mut errors = Vec::new();

    for extract_id in &extract_ids {
        match repo.delete_extract(extract_id).await {
            Ok(_) => succeeded.push(extract_id.clone()),
            Err(e) => {
                failed.push(extract_id.clone());
                errors.push(format!("{}: {}", extract_id, e));
            }
        }
    }

    Ok(BulkOperationResult {
        succeeded,
        failed,
        errors,
    })
}

#[tauri::command]
pub async fn bulk_generate_cards(
    extract_ids: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<BulkOperationResult> {
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();
    let mut errors = Vec::new();

    let generator = crate::generator::LearningItemGenerator::new();

    for extract_id in &extract_ids {
        // Get the extract
        let extract = match repo.get_extract(extract_id).await {
            Ok(Some(extract)) => extract,
            Ok(None) => {
                failed.push(extract_id.clone());
                errors.push(format!("{}: Extract not found", extract_id));
                continue;
            }
            Err(e) => {
                failed.push(extract_id.clone());
                errors.push(format!("{}: {}", extract_id, e));
                continue;
            }
        };

        // Generate learning items from extract
        let learning_items = generator.generate_from_extract(&extract);

        // Create each learning item
        let mut item_created = false;
        let mut has_error = false;
        for mut item in learning_items {
            item.extract_id = Some(extract_id.clone());
            match repo.create_learning_item(&item).await {
                Ok(_) => item_created = true,
                Err(e) => {
                    has_error = true;
                    errors.push(format!("{}: {}", extract_id, e));
                }
            }
        }

        if has_error {
            failed.push(extract_id.clone());
        } else if item_created {
            succeeded.push(extract_id.clone());
        }
    }

    Ok(BulkOperationResult {
        succeeded,
        failed,
        errors,
    })
}
