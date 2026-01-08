//! Cloud storage commands
//!
//! Commands for cloud backup, sync, and OAuth authentication

pub mod oauth;
pub mod backup;
pub mod sync;

// Re-export OAuth commands
pub use oauth::{
    oauth_start,
    oauth_callback,
    oauth_get_account,
    oauth_disconnect,
    oauth_is_authenticated,
};

// Re-export backup commands
pub use backup::{
    backup_create,
    backup_restore,
    backup_list,
    backup_delete,
};

// Re-export sync commands
pub use sync::{
    cloud_sync_init,
    cloud_sync_now,
    cloud_sync_get_status,
    cloud_sync_resolve_conflicts,
    cloud_list_files,
    cloud_import_files,
};
