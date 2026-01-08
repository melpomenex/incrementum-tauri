//! OCR (Optical Character Recognition) service module
//!
//! Provides integration with multiple OCR providers:
//! - Tesseract (local)
//! - Google Document AI (cloud)
//! - AWS Textract (cloud)
//! - Azure Computer Vision (cloud)

pub mod providers;
pub mod processor;

pub use providers::{OCRProvider, OCRProviderType, OCRResult, OCRError};
pub use processor::OCRProcessor;

use serde::{Deserialize, Serialize};

/// OCR configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRConfig {
    /// Default provider to use
    pub default_provider: OCRProviderType,
    /// Tesseract installation path (for local OCR)
    pub tesseract_path: Option<String>,
    /// Google Document AI credentials
    pub google_document_ai: Option<GoogleDocumentAIConfig>,
    /// AWS Textract configuration
    pub aws_textract: Option<AWSTextractConfig>,
    /// Azure Computer Vision configuration
    pub azure_vision: Option<AzureVisionConfig>,
}

/// Google Document AI configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleDocumentAIConfig {
    pub project_id: String,
    pub location: String,
    pub processor_id: String,
    pub credentials_path: String,
}

/// AWS Textract configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AWSTextractConfig {
    pub region: String,
    pub access_key: String,
    pub secret_key: String,
}

/// Azure Computer Vision configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AzureVisionConfig {
    pub endpoint: String,
    pub api_key: String,
}

impl Default for OCRConfig {
    fn default() -> Self {
        Self {
            default_provider: OCRProviderType::Tesseract,
            tesseract_path: None,
            google_document_ai: None,
            aws_textract: None,
            azure_vision: None,
        }
    }
}
