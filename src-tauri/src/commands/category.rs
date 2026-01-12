//! Category commands

use tauri::State;
use crate::database::Repository;
use crate::error::Result;
use crate::models::Category;

#[tauri::command]
pub async fn get_categories(
    _repo: State<'_, Repository>,
) -> Result<Vec<Category>> {
    // TODO: Implement category listing
    Ok(vec![])
}

#[tauri::command]
pub async fn create_category(
    name: String,
    _repo: State<'_, Repository>,
) -> Result<Category> {
    let category = Category::new(name);
    // TODO: Implement category creation
    Ok(category)
}
