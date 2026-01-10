/**
 * Integration tests for OCR commands (IPC layer)
 *
 * These tests verify the communication between frontend and backend
 * through Tauri's invoke mechanism.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initOCR,
  ocrImageFile,
  ocrImageBytes,
  extractKeyPhrases,
  getAvailableOCRProviders,
  isProviderAvailable,
  getOCRConfig,
  updateOCRConfig,
} from "../ocrCommands";
import type { OCRConfig } from "../ocrCommands";

// Mock Tauri invoke function
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

describe("OCR Commands Integration Tests", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe("initOCR", () => {
    it("should initialize OCR with valid config", async () => {
      const config: OCRConfig = {
        default_provider: "tesseract",
        tesseract_path: "/usr/bin/tesseract",
      };

      mockInvoke.mockResolvedValue(undefined);

      await initOCR(config);

      expect(mockInvoke).toHaveBeenCalledWith("init_ocr", { config });
    });

    it("should handle initialization errors gracefully", async () => {
      const config: OCRConfig = {
        default_provider: "tesseract",
      };

      mockInvoke.mockRejectedValue(new Error("OCR initialization failed"));

      await expect(initOCR(config)).rejects.toThrow("OCR initialization failed");
    });
  });

  describe("ocrImageFile", () => {
    it("should OCR an image file successfully", async () => {
      const request = {
        image_path: ["/path/to/image.png"],
        provider: "tesseract",
        language: "eng",
      };

      const mockResponse = {
        text: "Sample OCR text",
        confidence: 95.0,
        line_count: 2,
        word_count: 3,
        processing_time_ms: 150,
        provider: "Tesseract",
        success: true,
      };

      mockInvoke.mockResolvedValue(mockResponse);

      const result = await ocrImageFile(request);

      expect(mockInvoke).toHaveBeenCalledWith("ocr_image_file", { request });
      expect(result.text).toBe("Sample OCR text");
      expect(result.success).toBe(true);
    });

    it("should handle OCR failures", async () => {
      const request = {
        image_path: ["/path/to/image.png"],
      };

      const mockResponse = {
        text: "",
        confidence: 0,
        line_count: 0,
        word_count: 0,
        processing_time_ms: 50,
        provider: "unknown",
        success: false,
        error: "Image not found",
      };

      mockInvoke.mockResolvedValue(mockResponse);

      const result = await ocrImageFile(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Image not found");
    });

    it("should pass provider and language options", async () => {
      const request = {
        image_path: ["/path/to/image.png"],
        provider: "google",
        language: "chi_sim",
      };

      mockInvoke.mockResolvedValue({
        text: "Sample text",
        confidence: 90,
        line_count: 1,
        word_count: 2,
        processing_time_ms: 200,
        provider: "GoogleDocumentAI",
        success: true,
      });

      await ocrImageFile(request);

      expect(mockInvoke).toHaveBeenCalledWith("ocr_image_file", { request });
    });
  });

  describe("ocrImageBytes", () => {
    it("should OCR image bytes successfully", async () => {
      const request = {
        image_data: "base64encodedimagedata...",
        provider: "tesseract",
      };

      mockInvoke.mockResolvedValue({
        text: "Decoded text",
        confidence: 88.5,
        line_count: 3,
        word_count: 5,
        processing_time_ms: 100,
        provider: "Tesseract",
        success: true,
      });

      const result = await ocrImageBytes(request);

      expect(mockInvoke).toHaveBeenCalledWith("ocr_image_bytes", { request });
      expect(result.text).toBe("Decoded text");
      expect(result.success).toBe(true);
    });

    it("should handle invalid base64 data", async () => {
      const request = {
        image_data: "invalid base64!!!",
      };

      mockInvoke.mockResolvedValue({
        text: "",
        confidence: 0,
        line_count: 0,
        word_count: 0,
        processing_time_ms: 10,
        provider: "unknown",
        success: false,
        error: "Failed to decode base64",
      });

      const result = await ocrImageBytes(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("decode");
    });
  });

  describe("extractKeyPhrases", () => {
    it("should extract key phrases from text", async () => {
      const request = {
        text: "Machine learning algorithms enable computers to learn from data. Machine learning is important for artificial intelligence.",
        max_phrases: 5,
      };

      mockInvoke.mockResolvedValue({
        phrases: [
          { text: "Machine learning", score: 0.9 },
          { text: "artificial intelligence", score: 0.7 },
          { text: "computers learn data", score: 0.5 },
        ],
      });

      const result = await extractKeyPhrases(request);

      expect(mockInvoke).toHaveBeenCalledWith("extract_key_phrases", { request });
      expect(result.phrases).toHaveLength(3);
      expect(result.phrases[0].text).toBe("Machine learning");
      expect(result.phrases[0].score).toBe(0.9);
    });

    it("should handle empty text", async () => {
      const request = {
        text: "",
        max_phrases: 5,
      };

      mockInvoke.mockResolvedValue({ phrases: [] });

      const result = await extractKeyPhrases(request);

      expect(result.phrases).toEqual([]);
    });

    it("should respect max_phrases parameter", async () => {
      const request = {
        text: "Word1 word2 word3 word4 word5 word6 word7 word8 word9 word10",
        max_phrases: 3,
      };

      mockInvoke.mockResolvedValue({
        phrases: [
          { text: "phrase1", score: 0.9 },
          { text: "phrase2", score: 0.8 },
          { text: "phrase3", score: 0.7 },
        ],
      });

      const result = await extractKeyPhrases(request);

      expect(result.phrases.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getAvailableOCRProviders", () => {
    it("should return list of available providers", async () => {
      mockInvoke.mockResolvedValue(["Tesseract", "Marker", "Nougat"]);

      const providers = await getAvailableOCRProviders();

      expect(mockInvoke).toHaveBeenCalledWith("get_available_ocr_providers");
      expect(providers).toContain("Tesseract");
      expect(providers).toContain("Marker");
      expect(providers).toContain("Nougat");
    });

    it("should return empty array if no providers available", async () => {
      mockInvoke.mockResolvedValue([]);

      const providers = await getAvailableOCRProviders();

      expect(providers).toEqual([]);
    });
  });

  describe("isProviderAvailable", () => {
    it("should return true for available provider", async () => {
      mockInvoke.mockResolvedValue(true);

      const available = await isProviderAvailable("tesseract");

      expect(mockInvoke).toHaveBeenCalledWith("is_provider_available", { provider: "tesseract" });
      expect(available).toBe(true);
    });

    it("should return false for unavailable provider", async () => {
      mockInvoke.mockResolvedValue(false);

      const available = await isProviderAvailable("google");

      expect(available).toBe(false);
    });

    it("should handle unknown provider", async () => {
      mockInvoke.mockRejectedValue(new Error("Unknown provider: invalid"));

      await expect(isProviderAvailable("invalid")).rejects.toThrow("Unknown provider");
    });
  });

  describe("getOCRConfig", () => {
    it("should return current OCR configuration", async () => {
      const mockConfig: OCRConfig = {
        default_provider: "tesseract",
        tesseract_path: "/usr/bin/tesseract",
        google_document_ai: undefined,
        aws_textract: undefined,
        azure_vision: undefined,
      };

      mockInvoke.mockResolvedValue(mockConfig);

      const config = await getOCRConfig();

      expect(mockInvoke).toHaveBeenCalledWith("get_ocr_config");
      expect(config.default_provider).toBe("tesseract");
      expect(config.tesseract_path).toBe("/usr/bin/tesseract");
    });

    it("should handle uninitialized OCR", async () => {
      mockInvoke.mockRejectedValue(new Error("OCR processor not initialized"));

      await expect(getOCRConfig()).rejects.toThrow("OCR processor not initialized");
    });
  });

  describe("updateOCRConfig", () => {
    it("should update OCR configuration", async () => {
      const newConfig: OCRConfig = {
        default_provider: "marker",
        marker_path: "/usr/local/bin/marker",
      };

      mockInvoke.mockResolvedValue(undefined);

      await updateOCRConfig(newConfig);

      expect(mockInvoke).toHaveBeenCalledWith("update_ocr_config", { config: newConfig });
    });

    it("should handle update errors", async () => {
      const config: OCRConfig = {
        default_provider: "invalid",
      };

      mockInvoke.mockRejectedValue(new Error("Invalid provider"));

      await expect(updateOCRConfig(config)).rejects.toThrow("Invalid provider");
    });
  });

  describe("Error Handling", () => {
    it("should handle network timeout errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Network timeout"));

      await expect(getAvailableOCRProviders()).rejects.toThrow("Network timeout");
    });

    it("should handle serialization errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to serialize request"));

      await expect(ocrImageFile({ image_path: ["/test.png"] })).rejects.toThrow("serialize");
    });

    it("should handle backend errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("Backend error: OCR service unavailable"));

      await expect(initOCR({ default_provider: "tesseract" })).rejects.toThrow();
    });
  });

  describe("Command Sequence", () => {
    it("should support init -> ocr -> extract workflow", async () => {
      // Init
      mockInvoke.mockResolvedValue(undefined);
      await initOCR({ default_provider: "tesseract" });

      // OCR
      mockInvoke.mockResolvedValue({
        text: "Machine learning is transforming technology.",
        confidence: 92,
        line_count: 1,
        word_count: 5,
        processing_time_ms: 150,
        provider: "Tesseract",
        success: true,
      });
      const ocrResult = await ocrImageFile({ image_path: ["/test.png"] });

      // Extract
      mockInvoke.mockResolvedValue({
        phrases: [
          { text: "Machine learning", score: 0.95 },
          { text: "transforming technology", score: 0.75 },
        ],
      });
      const phrases = await extractKeyPhrases({
        text: ocrResult.text,
        max_phrases: 5,
      });

      expect(phrases.phrases).toHaveLength(2);
      expect(phrases.phrases[0].text).toBe("Machine learning");
    });
  });
});
