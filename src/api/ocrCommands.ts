/**
 * OCR Commands API
 * Frontend API for OCR Tauri commands
 */

import { invokeCommand } from "../lib/tauri";

/**
 * OCR configuration
 */
export interface OCRConfig {
  default_provider: string;
  tesseract_path?: string;
  google_document_ai?: GoogleDocumentAIConfig;
  aws_textract?: AWSTextractConfig;
  azure_vision?: AzureVisionConfig;
}

export interface GoogleDocumentAIConfig {
  project_id: string;
  location: string;
  processor_id: string;
  credentials_path: string;
}

export interface AWSTextractConfig {
  region: string;
  access_key: string;
  secret_key: string;
}

export interface AzureVisionConfig {
  endpoint: string;
  api_key: string;
}

/**
 * OCR image file request
 */
export interface OCRImageRequest {
  image_path: string[];
  provider?: string;
  language?: string;
}

/**
 * OCR image bytes request
 */
export interface OCRBytesRequest {
  image_data: string;
  provider?: string;
  language?: string;
}

/**
 * OCR response
 */
export interface OCRResponse {
  text: string;
  confidence: number;
  line_count: number;
  word_count: number;
  processing_time_ms: number;
  provider: string;
  success: boolean;
  error?: string;
}

/**
 * Key phrase request
 */
export interface KeyPhraseRequest {
  text: string;
  max_phrases?: number;
}

/**
 * Key phrase
 */
export interface KeyPhrase {
  text: string;
  score: number;
}

/**
 * Key phrase response
 */
export interface KeyPhraseResponse {
  phrases: KeyPhrase[];
}

/**
 * Initialize OCR with configuration
 */
export async function initOCR(config: OCRConfig): Promise<void> {
  return invokeCommand("init_ocr", { config });
}

/**
 * Perform OCR on an image file
 */
export async function ocrImageFile(request: OCRImageRequest): Promise<OCRResponse> {
  return invokeCommand("ocr_image_file", { request });
}

/**
 * Perform OCR on image bytes (base64)
 */
export async function ocrImageBytes(request: OCRBytesRequest): Promise<OCRResponse> {
  return invokeCommand("ocr_image_bytes", { request });
}

/**
 * Extract key phrases from text
 */
export async function extractKeyPhrases(request: KeyPhraseRequest): Promise<KeyPhraseResponse> {
  return invokeCommand("extract_key_phrases", { request });
}

/**
 * Get available OCR providers
 */
export async function getAvailableOCRProviders(): Promise<string[]> {
  return invokeCommand("get_available_ocr_providers");
}

/**
 * Check if a provider is available
 */
export async function isProviderAvailable(provider: string): Promise<boolean> {
  return invokeCommand("is_provider_available", { provider });
}

/**
 * Get current OCR configuration
 */
export async function getOCRConfig(): Promise<OCRConfig> {
  return invokeCommand("get_ocr_config");
}

/**
 * Update OCR configuration
 */
export async function updateOCRConfig(config: OCRConfig): Promise<void> {
  return invokeCommand("update_ocr_config", { config });
}
