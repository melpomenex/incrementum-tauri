//! Database connection management

use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use std::path::PathBuf;
use std::str::FromStr;

use crate::error::{IncrementumError, Result};

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Create a new database connection pool
    pub async fn new(path: PathBuf) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Create connection options
        let options = SqliteConnectOptions::from_str(&format!("sqlite:{}", path.display()))
            .map_err(|e| IncrementumError::Internal(format!("Invalid database path: {}", e)))?
            .create_if_missing(true);

        // Create connection pool
        let pool = SqlitePool::connect_with(options).await?;

        Ok(Self { pool })
    }

    /// Get a reference to the connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Create a Database wrapper from an existing pool
    pub fn from_pool(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Run migrations on the database
    pub async fn migrate(&self) -> Result<()> {
        crate::database::migrations::run_migrations(self.pool()).await
    }

    /// Close the database connection
    pub async fn close(self) {
        self.pool.close().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_creation() {
        let db = Database::new(PathBuf::from(":memory:")).await;
        assert!(db.is_ok());
    }
}
