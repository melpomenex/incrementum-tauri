//! OCR provider implementations

use crate::error::{IncrementumError, Result};
use serde::{Deserialize, Serialize};

/// OCR provider type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum OCRProviderType {
    Tesseract,
    GoogleDocumentAI,
    AWSTextract,
    AzureVision,
    Marker,
    Nougat,
}

/// OCR result with text and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRResult {
    /// Extracted text
    pub text: String,
    /// Confidence score (0-100)
    pub confidence: f64,
    /// Number of lines detected
    pub line_count: usize,
    /// Number of words detected
    pub word_count: usize,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
    /// Provider used
    pub provider: OCRProviderType,
    /// Additional metadata
    pub metadata: serde_json::Value,
}

/// Bounding box for detected text regions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x0: f64,
    pub y0: f64,
    pub x1: f64,
    pub x2: f64,
    pub y1: f64,
    pub y2: f64,
}

/// Detected text line
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextLine {
    pub text: String,
    pub confidence: f64,
    pub bbox: BoundingBox,
}

/// OCR error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OCRError {
    ProviderUnavailable(String),
    InvalidInput(String),
    ProcessingFailed(String),
    ConfigurationError(String),
    RateLimitExceeded,
    InsufficientCredits,
}

impl std::fmt::Display for OCRError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OCRError::ProviderUnavailable(msg) => write!(f, "OCR provider unavailable: {}", msg),
            OCRError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            OCRError::ProcessingFailed(msg) => write!(f, "OCR processing failed: {}", msg),
            OCRError::ConfigurationError(msg) => write!(f, "OCR configuration error: {}", msg),
            OCRError::RateLimitExceeded => write!(f, "OCR rate limit exceeded"),
            OCRError::InsufficientCredits => write!(f, "Insufficient OCR credits"),
        }
    }
}

impl std::error::Error for OCRError {}

/// Trait for OCR providers
#[async_trait::async_trait]
pub trait OCRProvider: Send + Sync {
    /// Get provider type
    fn provider_type(&self) -> OCRProviderType;

    /// Perform OCR on an image file
    async fn process_image(&self, image_path: &std::path::Path) -> Result<OCRResult>;

    /// Perform OCR on image bytes
    async fn process_image_bytes(&self, image_data: &[u8]) -> Result<OCRResult>;

    /// Check if provider is available
    fn is_available(&self) -> bool;

    /// Get provider name for display
    fn provider_name(&self) -> &str;
}

/// Tesseract OCR provider (local)
pub struct TesseractProvider {
    tesseract_path: Option<String>,
    client: reqwest::Client,
}

impl TesseractProvider {
    pub fn new(tesseract_path: Option<String>) -> Self {
        Self {
            tesseract_path,
            client: reqwest::Client::new(),
        }
    }

    /// Check if Tesseract is installed
    pub fn check_installation(&self) -> Result<()> {
        let cmd = self
            .tesseract_path
            .clone()
            .unwrap_or_else(|| "tesseract".to_string());

        let output = std::process::Command::new(&cmd)
            .arg("--version")
            .output();

        match output {
            Ok(output) if output.status.success() => Ok(()),
            _ => Err(IncrementumError::Internal("Tesseract not found. Please install it or provide the correct path.".to_string())),
        }
    }
}

impl std::fmt::Debug for TesseractProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TesseractProvider")
            .field("tesseract_path", &self.tesseract_path)
            .finish()
    }
}

#[async_trait::async_trait]
impl OCRProvider for TesseractProvider {
    fn provider_type(&self) -> OCRProviderType {
        OCRProviderType::Tesseract
    }

    async fn process_image(&self, image_path: &std::path::Path) -> Result<OCRResult> {
        let start = std::time::Instant::now();

        // Check if Tesseract is available
        self.check_installation()?;

        let cmd = self
            .tesseract_path
            .clone()
            .unwrap_or_else(|| "tesseract".to_string());

        // Run Tesseract with output to stdout
        let output = std::process::Command::new(&cmd)
            .arg(image_path)
            .arg("stdout")
            .arg("-l")
            .arg("eng")
            .output()
            .map_err(|e| {
                IncrementumError::Internal(format!("Failed to run Tesseract: {}", e))
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(IncrementumError::Internal(format!(
                "Tesseract processing failed: {}",
                stderr
            )));
        }

        let text = String::from_utf8_lossy(&output.stdout).to_string();
        let processing_time_ms = start.elapsed().as_millis() as u64;

        // Count lines and words
        let line_count = text.lines().count();
        let word_count = text.split_whitespace().count();

        // Tesseract doesn't provide confidence in simple mode
        // In production, you'd use the HOCR output format
        let confidence = 75.0; // Default confidence

        Ok(OCRResult {
            text,
            confidence,
            line_count,
            word_count,
            processing_time_ms,
            provider: OCRProviderType::Tesseract,
            metadata: serde_json::json!({
                "engine": "Tesseract",
                "version": "4.x"
            }),
        })
    }

    async fn process_image_bytes(&self, image_data: &[u8]) -> Result<OCRResult> {
        // Write bytes to temporary file
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!("ocr_{}.png", uuid::Uuid::new_v4()));

        tokio::fs::write(&temp_file, image_data)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to write temp file: {}", e)))?;

        let result = self.process_image(&temp_file).await;

        // Clean up temp file
        let _ = tokio::fs::remove_file(&temp_file).await;

        result
    }

    fn is_available(&self) -> bool {
        self.check_installation().is_ok()
    }

    fn provider_name(&self) -> &str {
        "Tesseract"
    }
}

/// Google Document AI provider (cloud)
pub struct GoogleDocumentAIProvider {
    project_id: String,
    location: String,
    processor_id: String,
    credentials: String,
    client: reqwest::Client,
}

impl GoogleDocumentAIProvider {
    pub fn new(config: super::GoogleDocumentAIConfig) -> Self {
        Self {
            project_id: config.project_id,
            location: config.location,
            processor_id: config.processor_id,
            credentials: config.credentials_path,
            client: reqwest::Client::new(),
        }
    }
}

impl std::fmt::Debug for GoogleDocumentAIProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GoogleDocumentAIProvider")
            .field("project_id", &self.project_id)
            .field("location", &self.location)
            .field("processor_id", &self.processor_id)
            .finish()
    }
}

#[async_trait::async_trait]
impl OCRProvider for GoogleDocumentAIProvider {
    fn provider_type(&self) -> OCRProviderType {
        OCRProviderType::GoogleDocumentAI
    }

    async fn process_image(&self, image_path: &std::path::Path) -> Result<OCRResult> {
        let _start = std::time::Instant::now();

        // Read image file
        let image_data = tokio::fs::read(image_path)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to read image: {}", e)))?;

        let mut result = self.process_image_bytes(&image_data).await?;
        result.metadata["image_path"] = serde_json::json!(image_path.to_string_lossy());

        Ok(result)
    }

    async fn process_image_bytes(&self, _image_data: &[u8]) -> Result<OCRResult> {
        // In production, this would use the Google Document AI client library
        // For now, return a placeholder error
        Err(IncrementumError::Internal(
            "Google Document AI integration requires additional dependencies. Please use Tesseract for now.".to_string()
        ))
    }

    fn is_available(&self) -> bool {
        // Check if credentials file exists
        std::path::Path::new(&self.credentials).exists()
    }

    fn provider_name(&self) -> &str {
        "Google Document AI"
    }
}

/// AWS Textract provider (cloud)
pub struct AWSTextractProvider {
    region: String,
    access_key: String,
    secret_key: String,
    client: reqwest::Client,
}

impl AWSTextractProvider {
    pub fn new(config: super::AWSTextractConfig) -> Self {
        Self {
            region: config.region,
            access_key: config.access_key,
            secret_key: config.secret_key,
            client: reqwest::Client::new(),
        }
    }
}

impl std::fmt::Debug for AWSTextractProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AWSTextractProvider")
            .field("region", &self.region)
            .finish()
    }
}

#[async_trait::async_trait]
impl OCRProvider for AWSTextractProvider {
    fn provider_type(&self) -> OCRProviderType {
        OCRProviderType::AWSTextract
    }

    async fn process_image(&self, image_path: &std::path::Path) -> Result<OCRResult> {
        // Read image file
        let image_data = tokio::fs::read(image_path)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to read image: {}", e)))?;

        self.process_image_bytes(&image_data).await
    }

    async fn process_image_bytes(&self, _image_data: &[u8]) -> Result<OCRResult> {
        // In production, this would use the AWS SDK for Rust
        // For now, return a placeholder error
        Err(IncrementumError::Internal(
            "AWS Textract integration requires additional dependencies. Please use Tesseract for now.".to_string()
        ))
    }

    fn is_available(&self) -> bool {
        !self.access_key.is_empty() && !self.secret_key.is_empty()
    }

    fn provider_name(&self) -> &str {
        "AWS Textract"
    }
}

/// Azure Computer Vision provider (cloud)
pub struct AzureVisionProvider {
    endpoint: String,
    api_key: String,
    client: reqwest::Client,
}

impl AzureVisionProvider {
    pub fn new(config: super::AzureVisionConfig) -> Self {
        Self {
            endpoint: config.endpoint,
            api_key: config.api_key,
            client: reqwest::Client::new(),
        }
    }
}

impl std::fmt::Debug for AzureVisionProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AzureVisionProvider")
            .field("endpoint", &self.endpoint)
            .finish()
    }
}

#[async_trait::async_trait]
impl OCRProvider for AzureVisionProvider {
    fn provider_type(&self) -> OCRProviderType {
        OCRProviderType::AzureVision
    }

    async fn process_image(&self, image_path: &std::path::Path) -> Result<OCRResult> {
        // Read image file
        let image_data = tokio::fs::read(image_path)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to read image: {}", e)))?;

        self.process_image_bytes(&image_data).await
    }

    async fn process_image_bytes(&self, _image_data: &[u8]) -> Result<OCRResult> {
        // In production, this would use the Azure SDK for Rust
        // For now, return a placeholder error
        Err(IncrementumError::Internal(
            "Azure Computer Vision integration requires additional dependencies. Please use Tesseract for now.".to_string()
        ))
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty() && !self.endpoint.is_empty()
    }

    fn provider_name(&self) -> &str {
        "Azure Computer Vision"
    }
}

/// Marker OCR provider (local PDF to markdown converter)
pub struct MarkerProvider {
    marker_path: Option<String>,
}

impl MarkerProvider {
    pub fn new(marker_path: Option<String>) -> Self {
        Self { marker_path }
    }

    /// Check if Marker is installed
    pub fn check_installation(&self) -> Result<()> {
        let cmd = self
            .marker_path
            .clone()
            .unwrap_or_else(|| "marker".to_string());

        let output = std::process::Command::new(&cmd)
            .arg("--version")
            .output();

        match output {
            Ok(output) if output.status.success() => Ok(()),
            _ => Err(IncrementumError::Internal("Marker not found. Please install it or provide the correct path.".to_string())),
        }
    }
}

impl std::fmt::Debug for MarkerProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MarkerProvider")
            .field("marker_path", &self.marker_path)
            .finish()
    }
}

#[async_trait::async_trait]
impl OCRProvider for MarkerProvider {
    fn provider_type(&self) -> OCRProviderType {
        OCRProviderType::Marker
    }

    async fn process_image(&self, image_path: &std::path::Path) -> Result<OCRResult> {
        let start = std::time::Instant::now();

        // Marker expects PDFs, for images we can convert first or use Tesseract
        // For now, we'll try running marker and it will handle the conversion
        let cmd = self
            .marker_path
            .clone()
            .unwrap_or_else(|| "marker".to_string());

        let output = std::process::Command::new(&cmd)
            .arg(image_path)
            .arg("--output_format")
            .arg("markdown")
            .output()
            .map_err(|e| {
                IncrementumError::Internal(format!("Failed to run Marker: {}", e))
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(IncrementumError::Internal(format!(
                "Marker processing failed: {}",
                stderr
            )));
        }

        let text = String::from_utf8_lossy(&output.stdout).to_string();
        let processing_time_ms = start.elapsed().as_millis() as u64;

        let line_count = text.lines().count();
        let word_count = text.split_whitespace().count();

        Ok(OCRResult {
            text,
            confidence: 85.0, // Marker typically has good accuracy
            line_count,
            word_count,
            processing_time_ms,
            provider: OCRProviderType::Marker,
            metadata: serde_json::json!({
                "engine": "Marker",
                "format": "markdown"
            }),
        })
    }

    async fn process_image_bytes(&self, image_data: &[u8]) -> Result<OCRResult> {
        // Write bytes to temporary file
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!("ocr_{}.png", uuid::Uuid::new_v4()));

        tokio::fs::write(&temp_file, image_data)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to write temp file: {}", e)))?;

        let result = self.process_image(&temp_file).await;

        // Clean up temp file
        let _ = tokio::fs::remove_file(&temp_file).await;

        result
    }

    fn is_available(&self) -> bool {
        self.check_installation().is_ok()
    }

    fn provider_name(&self) -> &str {
        "Marker"
    }
}

/// Nougat OCR provider (scientific documents with math)
pub struct NougatProvider {
    nougat_path: Option<String>,
}

impl NougatProvider {
    pub fn new(nougat_path: Option<String>) -> Self {
        Self { nougat_path }
    }

    /// Check if Nougat is installed
    pub fn check_installation(&self) -> Result<()> {
        let cmd = self
            .nougat_path
            .clone()
            .unwrap_or_else(|| "nougat".to_string());

        let output = std::process::Command::new(&cmd)
            .arg("--version")
            .output();

        match output {
            Ok(output) if output.status.success() => Ok(()),
            _ => Err(IncrementumError::Internal("Nougat not found. Please install it or provide the correct path.".to_string())),
        }
    }
}

impl std::fmt::Debug for NougatProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("NougatProvider")
            .field("nougat_path", &self.nougat_path)
            .finish()
    }
}

#[async_trait::async_trait]
impl OCRProvider for NougatProvider {
    fn provider_type(&self) -> OCRProviderType {
        OCRProviderType::Nougat
    }

    async fn process_image(&self, image_path: &std::path::Path) -> Result<OCRResult> {
        let start = std::time::Instant::now();

        let cmd = self
            .nougat_path
            .clone()
            .unwrap_or_else(|| "nougat".to_string());

        let output = std::process::Command::new(&cmd)
            .arg(image_path)
            .output()
            .map_err(|e| {
                IncrementumError::Internal(format!("Failed to run Nougat: {}", e))
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(IncrementumError::Internal(format!(
                "Nougat processing failed: {}",
                stderr
            )));
        }

        let text = String::from_utf8_lossy(&output.stdout).to_string();
        let processing_time_ms = start.elapsed().as_millis() as u64;

        let line_count = text.lines().count();
        let word_count = text.split_whitespace().count();

        Ok(OCRResult {
            text,
            confidence: 80.0, // Nougat is good but can struggle with complex layouts
            line_count,
            word_count,
            processing_time_ms,
            provider: OCRProviderType::Nougat,
            metadata: serde_json::json!({
                "engine": "Nougat",
                "math_support": true
            }),
        })
    }

    async fn process_image_bytes(&self, image_data: &[u8]) -> Result<OCRResult> {
        // Write bytes to temporary file
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!("ocr_{}.png", uuid::Uuid::new_v4()));

        tokio::fs::write(&temp_file, image_data)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to write temp file: {}", e)))?;

        let result = self.process_image(&temp_file).await;

        // Clean up temp file
        let _ = tokio::fs::remove_file(&temp_file).await;

        result
    }

    fn is_available(&self) -> bool {
        self.check_installation().is_ok()
    }

    fn provider_name(&self) -> &str {
        "Nougat"
    }
}

/// Create OCR provider from type and config
pub fn create_provider(
    provider_type: OCRProviderType,
    config: &super::OCRConfig,
) -> Result<Box<dyn OCRProvider>> {
    match provider_type {
        OCRProviderType::Tesseract => {
            Ok(Box::new(TesseractProvider::new(config.tesseract_path.clone())))
        }
        OCRProviderType::GoogleDocumentAI => {
            let google_config = config.google_document_ai.as_ref()
                .ok_or_else(|| IncrementumError::Internal("Google Document AI config not set".to_string()))?;
            Ok(Box::new(GoogleDocumentAIProvider::new(google_config.clone())))
        }
        OCRProviderType::AWSTextract => {
            let aws_config = config.aws_textract.as_ref()
                .ok_or_else(|| IncrementumError::Internal("AWS Textract config not set".to_string()))?;
            Ok(Box::new(AWSTextractProvider::new(aws_config.clone())))
        }
        OCRProviderType::AzureVision => {
            let azure_config = config.azure_vision.as_ref()
                .ok_or_else(|| IncrementumError::Internal("Azure Vision config not set".to_string()))?;
            Ok(Box::new(AzureVisionProvider::new(azure_config.clone())))
        }
        OCRProviderType::Marker => {
            Ok(Box::new(MarkerProvider::new(config.marker_path.clone())))
        }
        OCRProviderType::Nougat => {
            Ok(Box::new(NougatProvider::new(config.nougat_path.clone())))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocr_result_serialization() {
        let result = OCRResult {
            text: "Test text".to_string(),
            confidence: 95.0,
            line_count: 1,
            word_count: 2,
            processing_time_ms: 100,
            provider: OCRProviderType::Tesseract,
            metadata: serde_json::json!({}),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("Test text"));
    }
}
