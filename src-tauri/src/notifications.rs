//! Desktop notification system
//!
//! Provides cross-platform desktop notifications using Tauri

use crate::error::Result;
use serde::{Deserialize, Serialize};

/// Notification priority
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum NotificationPriority {
    Low,
    Normal,
    High,
    Critical,
}

/// Notification type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum NotificationType {
    /// Study reminder
    StudyReminder,
    /// Cards due
    CardsDue,
    /// Review completed
    ReviewCompleted,
    /// Document imported
    DocumentImported,
    /// Extraction completed
    ExtractionCompleted,
    /// System notification
    System,
    /// Custom notification
    Custom,
}

/// Notification data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    /// Notification ID
    pub id: String,
    /// Notification type
    pub notification_type: NotificationType,
    /// Title
    pub title: String,
    /// Body/message
    pub body: String,
    /// Priority
    pub priority: NotificationPriority,
    /// Optional icon URL
    pub icon: Option<String>,
    /// Optional image URL
    pub image: Option<String>,
    /// Optional click action (deeplink)
    pub action: Option<String>,
    /// Notification timestamp
    pub created_at: String,
    /// Whether notification was read
    pub read: bool,
    /// TTL (time to live) in seconds
    pub ttl: Option<u32>,
}

/// Notification permission status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum NotificationPermission {
    Granted,
    Denied,
    NotRequested,
}

/// Notification manager
pub struct NotificationManager {
    enabled: bool,
}

impl NotificationManager {
    pub fn new(enabled: bool) -> Self {
        Self { enabled }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Check notification permission
    pub fn check_permission(&self) -> Result<NotificationPermission> {
        if !self.enabled {
            return Ok(NotificationPermission::NotRequested);
        }

        // In a real implementation, you would check system permissions
        // For now, we'll assume granted if enabled
        Ok(NotificationPermission::Granted)
    }

    /// Request notification permission
    pub async fn request_permission(&mut self) -> Result<NotificationPermission> {
        // Tauri handles this automatically
        self.enabled = true;
        Ok(NotificationPermission::Granted)
    }

    /// Send a notification
    pub async fn send(&self, notification: Notification) -> Result<()> {
        if !self.enabled {
            return Ok(());
        }

        // In production, this would use Tauri's notification plugin
        let _ = serde_json::json!({
            "title": notification.title,
            "body": notification.body,
            "icon": notification.icon,
            "image": notification.image,
            "sound": notification.priority == NotificationPriority::Critical || notification.priority == NotificationPriority::High,
        });

        // In production, this would use Tauri's emit to trigger the frontend notification
        // For now, we'll just log it
        eprintln!("Sending notification: {}", notification.title);

        Ok(())
    }

    /// Create a study reminder notification
    pub fn create_study_reminder(due_count: usize, new_count: usize) -> Notification {
        let title = if due_count > 0 {
            format!("Time to Review! ({} cards due)", due_count)
        } else {
            "Ready to Study?".to_string()
        };

        let body = if due_count > 0 && new_count > 0 {
            format!("You have {} cards due and {} new cards waiting.", due_count, new_count)
        } else if due_count > 0 {
            format!("You have {} cards due for review.", due_count)
        } else if new_count > 0 {
            format!("You have {} new cards to learn.", new_count)
        } else {
            "Your review queue is ready!".to_string()
        };

        Notification {
            id: uuid::Uuid::new_v4().to_string(),
            notification_type: NotificationType::StudyReminder,
            title,
            body,
            priority: NotificationPriority::Normal,
            icon: Some("📚".to_string()),
            image: None,
            action: Some("incrementum://queue".to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
            read: false,
            ttl: Some(3600), // 1 hour
        }
    }

    /// Create a cards due notification
    pub fn create_cards_due(count: usize, overdue: usize) -> Notification {
        let (title, body, priority) = if overdue > 0 {
            (
                "Overdue Reviews!".to_string(),
                format!("You have {} overdue cards to review.", overdue),
                NotificationPriority::High,
            )
        } else {
            (
                "Reviews Due".to_string(),
                format!("You have {} cards due for review.", count),
                NotificationPriority::Normal,
            )
        };

        Notification {
            id: uuid::Uuid::new_v4().to_string(),
            notification_type: NotificationType::CardsDue,
            title,
            body,
            priority,
            icon: Some("⏰".to_string()),
            image: None,
            action: Some("incrementum://queue".to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
            read: false,
            ttl: Some(7200), // 2 hours
        }
    }

    /// Create a review completed notification
    pub fn create_review_completed(
        cards_reviewed: usize,
        time_spent: u32,
        retention: f64,
    ) -> Notification {
        let title = "Great job! 🎉";
        let body = format!(
            "Reviewed {} cards in {} minutes. Retention: {:.0}%",
            cards_reviewed,
            time_spent / 60,
            retention * 100.0
        );

        Notification {
            id: uuid::Uuid::new_v4().to_string(),
            notification_type: NotificationType::ReviewCompleted,
            title: title.to_string(),
            body,
            priority: NotificationPriority::Low,
            icon: Some("✅".to_string()),
            image: None,
            action: Some("incrementum://dashboard".to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
            read: false,
            ttl: Some(86400), // 24 hours
        }
    }

    /// Create a document imported notification
    pub fn create_document_imported(title: String, extract_count: usize) -> Notification {
        let body = if extract_count > 0 {
            format!("Imported with {} extracts ready for review.", extract_count)
        } else {
            "Document imported successfully!".to_string()
        };

        Notification {
            id: uuid::Uuid::new_v4().to_string(),
            notification_type: NotificationType::DocumentImported,
            title: format!("Document Imported: {}", title),
            body,
            priority: NotificationPriority::Normal,
            icon: Some("📄".to_string()),
            image: None,
            action: Some("incrementum://documents".to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
            read: false,
            ttl: Some(3600),
        }
    }

    /// Schedule periodic notifications
    pub async fn schedule_study_reminders(&self, hour: u8, minute: u8) -> Result<()> {
        // In production, this would set up system scheduler/alarms
        eprintln!("Scheduled study reminders for {:02}:{:02}", hour, minute);
        Ok(())
    }
}

impl Default for NotificationManager {
    fn default() -> Self {
        Self::new(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_study_reminder() {
        let notification = NotificationManager::create_study_reminder(10, 5);

        assert_eq!(notification.notification_type, NotificationType::StudyReminder);
        assert!(notification.title.contains("10"));
        assert!(notification.body.contains("5"));
    }

    #[test]
    fn test_create_cards_due() {
        let notification = NotificationManager::create_cards_due(20, 5);

        assert_eq!(notification.notification_type, NotificationType::CardsDue);
        assert!(notification.title.contains("Overdue"));
        assert!(notification.body.contains("5"));
    }

    #[test]
    fn test_create_review_completed() {
        let notification = NotificationManager::create_review_completed(25, 600, 0.85);

        assert_eq!(notification.notification_type, NotificationType::ReviewCompleted);
        assert!(notification.title.contains("Great job"));
        assert!(notification.body.contains("25"));
    }
}
