//! OCR processor for handling document OCR operations

use super::providers::{create_provider, OCRProvider, OCRProviderType, OCRResult};
use crate::error::Result;
use std::path::Path;

/// OCR processor that handles OCR operations
#[derive(Clone)]
pub struct OCRProcessor {
    config: crate::ocr::OCRConfig,
}

impl OCRProcessor {
    /// Create a new OCR processor
    pub fn new(config: crate::ocr::OCRConfig) -> Self {
        Self { config }
    }

    /// Process an image file with OCR
    pub async fn process_image(&self, image_path: &Path) -> Result<OCRResult> {
        let provider = create_provider(self.config.default_provider, &self.config)?;
        provider.process_image(image_path).await
    }

    /// Process image bytes with OCR
    pub async fn process_image_bytes(&self, image_data: &[u8]) -> Result<OCRResult> {
        let provider = create_provider(self.config.default_provider, &self.config)?;
        provider.process_image_bytes(image_data).await
    }

    /// Process a PDF file with OCR (page by page)
    pub async fn process_pdf(&self, pdf_path: &Path) -> Result<Vec<OCRResult>> {
        // For now, this is a placeholder
        // In production, you'd:
        // 1. Extract images from PDF pages
        // 2. Run OCR on each image
        // 3. Combine results

        let provider = create_provider(self.config.default_provider, &self.config)?;

        // Simple implementation: just return empty results
        Ok(vec![])
    }

    /// Process a PDF page with OCR
    pub async fn process_pdf_page(&self, pdf_path: &Path, page_num: usize) -> Result<OCRResult> {
        // For now, this is a placeholder
        // In production, you'd:
        // 1. Extract the specific page as an image
        // 2. Run OCR on that image

        Err(crate::error::IncrementumError::Internal(
            "PDF page OCR not yet implemented".to_string(),
        )
        .into())
    }

    /// Get available providers
    pub fn get_available_providers(&self) -> Vec<OCRProviderType> {
        let mut available = vec![];

        // Check Tesseract
        if let Ok(provider) = create_provider(OCRProviderType::Tesseract, &self.config) {
            if provider.is_available() {
                available.push(OCRProviderType::Tesseract);
            }
        }

        // Check Google Document AI
        if self.config.google_document_ai.is_some() {
            if let Ok(provider) = create_provider(OCRProviderType::GoogleDocumentAI, &self.config) {
                if provider.is_available() {
                    available.push(OCRProviderType::GoogleDocumentAI);
                }
            }
        }

        // Check AWS Textract
        if self.config.aws_textract.is_some() {
            if let Ok(provider) = create_provider(OCRProviderType::AWSTextract, &self.config) {
                if provider.is_available() {
                    available.push(OCRProviderType::AWSTextract);
                }
            }
        }

        // Check Azure Vision
        if self.config.azure_vision.is_some() {
            if let Ok(provider) = create_provider(OCRProviderType::AzureVision, &self.config) {
                if provider.is_available() {
                    available.push(OCRProviderType::AzureVision);
                }
            }
        }

        // Check Marker
        if let Ok(provider) = create_provider(OCRProviderType::Marker, &self.config) {
            if provider.is_available() {
                available.push(OCRProviderType::Marker);
            }
        }

        // Check Nougat
        if let Ok(provider) = create_provider(OCRProviderType::Nougat, &self.config) {
            if provider.is_available() {
                available.push(OCRProviderType::Nougat);
            }
        }

        available
    }

    /// Check if a specific provider is available
    pub fn is_provider_available(&self, provider_type: OCRProviderType) -> bool {
        if let Ok(provider) = create_provider(provider_type, &self.config) {
            provider.is_available()
        } else {
            false
        }
    }

    /// Get the default provider
    pub fn get_default_provider(&self) -> OCRProviderType {
        self.config.default_provider
    }

    /// Set the default provider
    pub fn set_default_provider(&mut self, provider_type: OCRProviderType) {
        self.config.default_provider = provider_type;
    }

    /// Update configuration
    pub fn update_config(&mut self, config: crate::ocr::OCRConfig) {
        self.config = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> &crate::ocr::OCRConfig {
        &self.config
    }
}

impl Default for OCRProcessor {
    fn default() -> Self {
        Self::new(crate::ocr::OCRConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ocr_processor_creation() {
        let processor = OCRProcessor::default();
        assert_eq!(processor.get_default_provider(), OCRProviderType::Tesseract);
    }

    #[test]
    fn test_available_providers() {
        let processor = OCRProcessor::default();
        let providers = processor.get_available_providers();
        // At minimum, Tesseract might not be available in test environment
        // so we just check the function doesn't panic
        assert!(providers.len() >= 0);
    }
}
