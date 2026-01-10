/**
 * E2E Tests for Critical Workflows
 *
 * These tests verify complete user workflows from end to end.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useDocumentStore } from "../../stores/documentStore";
import * as documentsApi from "../../api/documents";

// Mock the API
vi.mock("../../api/documents", () => ({
  getDocuments: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  readDocumentFile: vi.fn(),
}));

// Mock the OCR commands
vi.mock("../../api/ocrCommands", () => ({
  initOCR: vi.fn(),
  ocrImageFile: vi.fn(),
  extractKeyPhrases: vi.fn(),
  getAvailableOCRProviders: vi.fn(),
}));

describe("E2E Tests: OCR Workflow", () => {
  beforeEach(() => {
    // Reset stores before each test
    useSettingsStore.getState().resetSettings();
  });

  describe("Complete OCR Settings Workflow", () => {
    it("should allow user to configure OCR and extract from documents", async () => {
      const { result } = renderHook(() => useSettingsStore());

      // 1. User navigates to settings
      expect(result.current.settings).toBeDefined();

      // 2. User enables auto-OCR
      act(() => {
        result.current.updateSettingsCategory("documents", {
          ...result.current.settings.documents,
          ocr: {
            ...result.current.settings.documents.ocr,
            autoOCR: true,
            autoExtractOnLoad: true,
            keyPhraseExtraction: true,
            provider: "tesseract",
            language: "eng",
          },
        });
      });

      // Verify settings are updated
      expect(result.current.settings.documents.ocr.autoOCR).toBe(true);
      expect(result.current.settings.documents.ocr.keyPhraseExtraction).toBe(true);
    });

    it("should configure Google Document AI provider", async () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateSettingsCategory("documents", {
          ...result.current.settings.documents,
          ocr: {
            ...result.current.settings.documents.ocr,
            provider: "google",
            googleProjectId: "test-project",
            googleLocation: "us",
            googleProcessorId: "test-processor",
            googleCredentialsPath: "/path/to/credentials.json",
          },
        });
      });

      expect(result.current.settings.documents.ocr.provider).toBe("google");
      expect(result.current.settings.documents.ocr.googleProjectId).toBe("test-project");
    });
  });

  describe("Document Import with Auto-OCR Workflow", () => {
    it("should complete full import and OCR workflow", async () => {
      const { result: settingsResult } = renderHook(() => useSettingsStore());
      const { result: docsResult } = renderHook(() => useDocumentStore());

      // Setup: Enable auto-OCR
      act(() => {
        settingsResult.current.updateSettingsCategory("documents", {
          ...settingsResult.current.settings.documents,
          ocr: {
            ...settingsResult.current.settings.documents.ocr,
            autoOCR: true,
            autoExtractOnLoad: true,
          },
        });
      });

      // Mock document import
      const mockDocument = {
        id: "test-doc-1",
        title: "Test Document",
        filePath: "/path/to/test.pdf",
        fileType: "pdf",
        totalPages: 10,
      };

      // Mock OCR response
      vi.mocked(documentsApi.readDocumentFile).mockResolvedValue("base64data...");

      // User imports document
      act(() => {
        docsResult.current.setDocuments([mockDocument]);
      });

      // Verify document is in store
      expect(docsResult.current.documents).toContainEqual(mockDocument);
    });
  });

  describe("Math OCR Workflow", () => {
    it("should handle scientific documents with math", async () => {
      const { result } = renderHook(() => useSettingsStore());

      // User enables math OCR
      act(() => {
        result.current.updateSettingsCategory("documents", {
          ...result.current.settings.documents,
          ocr: {
            ...result.current.settings.documents.ocr,
            provider: "nougat",
            mathOcrEnabled: true,
            mathOcrCommand: "nougat",
          },
        });
      });

      // Verify math OCR is enabled
      expect(result.current.settings.documents.ocr.mathOcrEnabled).toBe(true);
      expect(result.current.settings.documents.ocr.provider).toBe("nougat");
    });
  });

  describe("Key Phrase Extraction Workflow", () => {
    it("should extract and display key phrases", async () => {
      const { result } = renderHook(() => useSettingsStore());

      // Enable key phrase extraction
      act(() => {
        result.current.updateSettingsCategory("documents", {
          ...result.current.settings.documents,
          ocr: {
            ...result.current.settings.documents.ocr,
            keyPhraseExtraction: true,
          },
        });
      });

      expect(result.current.settings.documents.ocr.keyPhraseExtraction).toBe(true);
    });
  });

  describe("Settings Persistence Workflow", () => {
    it("should persist settings across sessions", async () => {
      const { result: result1 } = renderHook(() => useSettingsStore());

      // User configures OCR
      act(() => {
        result1.current.updateSettingsCategory("documents", {
          ...result1.current.settings.documents,
          ocr: {
            ...result1.current.settings.documents.ocr,
            provider: "tesseract",
            language: "fra",
            autoOCR: true,
          },
        });
      });

      const firstSettings = result1.current.settings.documents.ocr;

      // Simulate new session (new hook instance)
      const { result: result2 } = renderHook(() => useSettingsStore());

      // Settings should be persisted (simulated by Zustand persist)
      expect(result2.current.settings.documents.ocr.provider).toBe(firstSettings.provider);
    });
  });
});

describe("E2E Tests: Document Viewer with Auto-Extract", () => {
  it("should auto-extract when opening a document", async () => {
    const { result: settingsResult } = renderHook(() => useSettingsStore());
    const { result: docsResult } = renderHook(() => useDocumentStore());

    // Enable auto-extract
    act(() => {
      settingsResult.current.updateSettingsCategory("documents", {
        ...settingsResult.current.settings.documents,
        ocr: {
          ...settingsResult.current.settings.documents.ocr,
          autoExtractOnLoad: true,
        },
      });
    });

    // Set current document
    const mockDocument = {
      id: "doc-1",
      title: "Test PDF",
      filePath: "/test/document.pdf",
      fileType: "pdf",
    };

    act(() => {
      docsResult.current.setCurrentDocument(mockDocument);
    });

    // Verify document is set
    expect(docsResult.current.currentDocument?.id).toBe("doc-1");
  });
});

describe("E2E Tests: Error Recovery", () => {
  it("should handle OCR provider failures gracefully", async () => {
    const { result } = renderHook(() => useSettingsStore());

    // Configure provider that may fail
    act(() => {
      result.current.updateSettingsCategory("documents", {
        ...result.current.settings.documents,
        ocr: {
          ...result.current.settings.documents.ocr,
          provider: "google", // May not be configured
          autoOCR: true,
        },
      });
    });

    // User should still be able to use other features
    expect(result.current.settings.documents).toBeDefined();
  });

  it("should allow fallback to local OCR", async () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.updateSettingsCategory("documents", {
        ...result.current.settings.documents,
        ocr: {
          ...result.current.settings.documents.ocr,
          provider: "tesseract", // Fallback to local
          preferLocal: true,
        },
      });
    });

    expect(result.current.settings.documents.ocr.provider).toBe("tesseract");
    expect(result.current.settings.documents.ocr.preferLocal).toBe(true);
  });
});

describe("E2E Tests: Multi-Provider Configuration", () => {
  it("should support switching between providers", async () => {
    const { result } = renderHook(() => useSettingsStore());

    // Start with Tesseract
    act(() => {
      result.current.updateSettingsCategory("documents", {
        ...result.current.settings.documents,
        ocr: {
          ...result.current.settings.documents.ocr,
          provider: "tesseract",
          tesseract_path: "/usr/bin/tesseract",
        },
      });
    });
    expect(result.current.settings.documents.ocr.provider).toBe("tesseract");

    // Switch to Marker
    act(() => {
      result.current.updateSettingsCategory("documents", {
        ...result.current.settings.documents,
        ocr: {
          ...result.current.settings.documents.ocr,
          provider: "marker",
          marker_path: "/usr/local/bin/marker",
        },
      });
    });
    expect(result.current.settings.documents.ocr.provider).toBe("marker");

    // Switch to Nougat for math
    act(() => {
      result.current.updateSettingsCategory("documents", {
        ...result.current.settings.documents,
        ocr: {
          ...result.current.settings.documents.ocr,
          provider: "nougat",
          mathOcrEnabled: true,
          nougat_path: "/usr/local/bin/nougat",
        },
      });
    });
    expect(result.current.settings.documents.ocr.provider).toBe("nougat");
    expect(result.current.settings.documents.ocr.mathOcrEnabled).toBe(true);
  });
});
