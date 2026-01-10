//! Incrementum Tauri application

mod error;
mod models;
mod database;
mod commands;
mod processor;
mod generator;
mod algorithms;
mod ai;
mod anki;
mod youtube;
mod sync;
mod integrations;
mod ocr;
mod segmentation;
mod notifications;
mod mcp;
mod cloud;
mod cloud_sync;
mod backup;
mod scheduler;

use database::Database;
use std::sync::{Arc, Mutex};
use tauri::Manager;

// Global state for the database
struct AppState {
    db: Arc<Mutex<Option<Database>>>,
}

// Import AI command module types
use commands::ai::AIState;

impl AppState {
    fn new() -> Self {
        Self {
            db: Arc::new(Mutex::new(None)),
        }
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize async runtime for database setup
            tauri::async_runtime::block_on(async {
                // Get app data directory
                let app_dir = app
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app data dir");

                // Ensure directory exists
                std::fs::create_dir_all(&app_dir)
                    .expect("Failed to create app data dir");

                let db_path = app_dir.join("incrementum.db");

                // Initialize database
                let db = Database::new(db_path)
                    .await
                    .expect("Failed to initialize database");

                // Run migrations
                db.migrate()
                    .await
                    .expect("Failed to run migrations");

                // Store database in app state
                let state = AppState::new();
                *state.db.lock().unwrap() = Some(db);

                // Create repository for use in commands
                let repo = database::Repository::new(
                    state.db.lock().unwrap().as_ref().unwrap().pool().clone()
                );

                app.manage(state);
                app.manage(repo);
                app.manage(AIState::default());

                tracing_subscriber::fmt::init();

                if let Some(window) = app.get_webview_window("main") {
                    if std::env::var("INCREMENTUM_OPEN_DEVTOOLS").is_ok() {
                        let _ = window.open_devtools();
                    }
                    let _ = window.eval(
                        "console.log('Webview location:', window.location.href);",
                    );
                }

                Ok(())
            })
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // Document commands
            commands::get_documents,
            commands::get_document,
            commands::create_document,
            commands::update_document,
            commands::update_document_priority,
            commands::delete_document,
            commands::import_document,
            commands::import_documents,
            commands::read_document_file,
            commands::fetch_url_content,
            // Extract commands
            commands::get_extracts,
            commands::get_extract,
            commands::create_extract,
            commands::update_extract,
            commands::delete_extract,
            commands::bulk_delete_extracts,
            commands::bulk_generate_cards,
            // Learning item commands
            commands::get_due_items,
            commands::create_learning_item,
            commands::generate_learning_items_from_extract,
            commands::get_learning_items,
            // Category commands
            commands::get_categories,
            commands::create_category,
            // Queue commands
            commands::get_queue,
            commands::get_next_queue_item,
            commands::get_queue_items,
            commands::get_queued_items,
            commands::get_due_queue_items,
            commands::get_queue_stats,
            commands::postpone_item,
            commands::bulk_suspend_items,
            commands::bulk_unsuspend_items,
            commands::bulk_delete_items,
            commands::export_queue,
            // Review commands
            commands::start_review,
            commands::submit_review,
            commands::get_next_review_times,
            commands::preview_review_intervals,
            commands::get_review_streak,
            // Algorithm commands
            commands::calculate_sm2_next,
            commands::rate_document,
            commands::calculate_priority_scores,
            commands::compare_algorithms_command,
            commands::get_algorithm_params,
            commands::get_review_statistics,
            commands::optimize_algorithm_params,
            // AI commands
            commands::get_ai_config,
            commands::set_ai_config,
            commands::set_api_key,
            commands::generate_flashcards_from_extract,
            commands::generate_flashcards_from_content,
            commands::answer_question,
            commands::answer_about_extract,
            commands::summarize_content,
            commands::extract_key_points,
            commands::generate_title,
            commands::simplify_content,
            commands::generate_questions,
            commands::list_ollama_models,
            commands::test_ai_connection,
            // Analytics commands
            commands::get_dashboard_stats,
            commands::get_memory_stats,
            commands::get_activity_data,
            commands::get_category_stats,
            // YouTube commands
            youtube::check_ytdlp,
            youtube::get_youtube_video_info,
            youtube::get_youtube_formats,
            youtube::download_youtube_video,
            youtube::get_youtube_transcript,
            youtube::get_youtube_transcript_by_id,
            youtube::search_youtube_videos,
            youtube::get_youtube_playlist_info,
            youtube::extract_youtube_video_id,
            youtube::import_youtube_video,
            // Sync commands
            sync::sync_now,
            sync::get_sync_status,
            sync::resolve_sync_conflict,
            sync::get_sync_log,
            // Integration commands
            integrations::export_to_obsidian,
            integrations::export_extract_to_obsidian,
            integrations::export_flashcards_to_obsidian,
            integrations::import_from_obsidian,
            integrations::sync_to_obsidian,
            integrations::sync_flashcard_to_anki,
            integrations::sync_flashcards_to_anki,
            integrations::start_extension_server,
            integrations::stop_extension_server,
            integrations::get_extension_server_status,
            integrations::send_to_extension,
            integrations::process_extension_page,
            // RSS commands
            commands::create_rss_feed,
            commands::get_rss_feeds,
            commands::get_rss_feed,
            commands::update_rss_feed,
            commands::delete_rss_feed,
            commands::create_rss_article,
            commands::get_rss_articles,
            commands::mark_rss_article_read,
            commands::toggle_rss_article_queued,
            commands::update_rss_feed_fetched,
            commands::get_rss_feed_unread_count,
            commands::cleanup_old_rss_articles,
            // Segmentation commands
            commands::segment_document,
            commands::auto_segment_and_create_extracts,
            // Legacy import commands
            commands::import_legacy_archive,
            commands::preview_segmentation,
            commands::extract_key_points_from_text,
            commands::batch_segment_documents,
            commands::get_recommended_segmentation,
            // Notification commands
            commands::check_notification_permission,
            commands::request_notification_permission,
            commands::send_notification,
            commands::send_study_reminder,
            commands::send_cards_due_notification,
            commands::send_review_completed_notification,
            commands::send_document_imported_notification,
            commands::schedule_study_reminders,
            commands::get_notification_settings,
            commands::update_notification_settings,
            commands::create_custom_notification,
            // MCP commands
            commands::mcp::mcp_list_servers,
            commands::mcp::mcp_add_server,
            commands::mcp::mcp_remove_server,
            commands::mcp::mcp_update_server,
            commands::mcp::mcp_list_tools,
            commands::mcp::mcp_call_tool,
            commands::mcp::mcp_get_incrementum_tools,
            commands::mcp::mcp_call_incrementum_tool,
            // LLM commands
            commands::llm::llm_chat,
            commands::llm::llm_chat_with_context,
            commands::llm::llm_stream_chat,
            commands::llm::llm_get_models,
            commands::llm::llm_test_connection,
            // Cloud OAuth commands
            commands::oauth_start,
            commands::oauth_callback,
            commands::oauth_get_account,
            commands::oauth_disconnect,
            commands::oauth_is_authenticated,
            // Cloud Backup commands
            commands::backup_create,
            commands::backup_restore,
            commands::backup_list,
            commands::backup_delete,
            // Cloud Sync commands
            commands::cloud_sync_init,
            commands::cloud_sync_now,
            commands::cloud_sync_get_status,
            commands::cloud_sync_resolve_conflicts,
            commands::cloud_list_files,
            commands::cloud_import_files,
            // Scheduler commands
            commands::scheduler_init,
            commands::scheduler_start,
            commands::scheduler_stop,
            commands::scheduler_update_config,
            commands::scheduler_get_status,
            commands::scheduler_trigger_backup,
            // Anki import commands
            anki::import_anki_package_to_learning_items,
            anki::import_anki_package_bytes_to_learning_items,
            // OCR commands
            commands::init_ocr,
            commands::ocr_image_file,
            commands::ocr_image_bytes,
            commands::extract_key_phrases,
            commands::get_available_ocr_providers,
            commands::is_provider_available,
            commands::get_ocr_config,
            commands::update_ocr_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
