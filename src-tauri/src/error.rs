//! Error types for Incrementum
use thiserror::Error;

#[derive(Error, Debug)]
pub enum IncrementumError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("FSRS error: {0}")]
    Fsrs(#[from] fsrs::FSRSError),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Integration error: {0}")]
    IntegrationError(String),

    #[error("Sync error: {0}")]
    SyncError(String),
}

// Implement From<String> for IncrementumError
impl From<String> for IncrementumError {
    fn from(s: String) -> Self {
        IncrementumError::Internal(s)
    }
}

impl serde::Serialize for IncrementumError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, IncrementumError>;

// Type alias for backwards compatibility
pub use IncrementumError as AppError;
