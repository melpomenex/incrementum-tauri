/**
 * Tauri API wrapper for document commands
 */

import { invokeCommand, openFilePicker as tauriOpenFilePicker, openFolderPicker as tauriOpenFolderPicker } from "../lib/tauri";
import { browserInvoke } from "../lib/browser-backend";
import { serializeViewState } from "../lib/readerPosition";
import { Document } from "../types/document";
import type { ViewState } from "../types/readerPosition";

/**
 * Check if running in web mode (not Tauri)
 */
function isWebMode(): boolean {
  return !("__TAURI__" in window);
}

export async function getDocuments(): Promise<Document[]> {
  if (isWebMode()) {
    return await browserInvoke<Document[]>("get_documents");
  }
  return await invokeCommand<Document[]>("get_documents");
}

export async function getDocument(id: string): Promise<Document | null> {
  if (isWebMode()) {
    return await browserInvoke<Document | null>("get_document", { id });
  }
  return await invokeCommand<Document | null>("get_document", { id });
}

export async function resolveDocumentCover(id: string): Promise<Document | null> {
  if (isWebMode()) {
    return await browserInvoke<Document | null>("resolve_document_cover", { id });
  }
  return await invokeCommand<Document | null>("resolve_document_cover", { id });
}

export async function createDocument(
  title: string,
  filePath: string,
  fileType: string
): Promise<Document> {
  if (isWebMode()) {
    return await browserInvoke<Document>("create_document", {
      title,
      filePath,
      fileType,
    });
  }
  return await invokeCommand<Document>("create_document", {
    title,
    filePath,
    fileType,
  });
}

export async function updateDocument(
  id: string,
  updates: Document
): Promise<Document> {
  if (isWebMode()) {
    return await browserInvoke<Document>("update_document", { id, updates });
  }
  return await invokeCommand<Document>("update_document", { id, updates });
}

export async function updateDocumentContent(
  id: string,
  content: string
): Promise<Document> {
  if (isWebMode()) {
    return await browserInvoke<Document>("update_document_content", { id, content });
  }
  return await invokeCommand<Document>("update_document_content", { id, content });
}

export async function updateDocumentPriority(
  id: string,
  rating: number,
  slider: number
): Promise<Document> {
  if (isWebMode()) {
    return await browserInvoke<Document>("update_document_priority", { id, rating, slider });
  }
  return await invokeCommand<Document>("update_document_priority", { id, rating, slider });
}

export async function deleteDocument(id: string): Promise<void> {
  if (isWebMode()) {
    await browserInvoke("delete_document", { id });
  } else {
    await invokeCommand("delete_document", { id });
  }
}

export async function importDocument(filePath: string): Promise<Document> {
  if (isWebMode()) {
    return await browserInvoke<Document>("import_document", { filePath });
  }
  return await invokeCommand<Document>("import_document", { filePath });
}

export async function importDocuments(filePaths: string[]): Promise<Document[]> {
  if (isWebMode()) {
    return await browserInvoke<Document[]>("import_documents", { filePaths });
  }
  return await invokeCommand<Document[]>("import_documents", { filePaths });
}

/**
 * Read document file contents as base64
 * Used for loading PDFs, EPUBs, etc. in the viewer
 */
export async function readDocumentFile(filePath: string): Promise<string> {
  if (isWebMode()) {
    return await browserInvoke<string>("read_document_file", { filePath });
  }
  return await invokeCommand<string>("read_document_file", { filePath });
}

/**
 * Extract text content from a document (for documents without content)
 * Returns the extracted text and whether it was newly extracted
 */
export async function extractDocumentText(id: string): Promise<{ content: string; extracted: boolean }> {
  if (isWebMode()) {
    return await browserInvoke<{ content: string; extracted: boolean }>("extract_document_text", { id });
  }
  return await invokeCommand<{ content: string; extracted: boolean }>("extract_document_text", { id });
}

/**
 * Open file picker dialog for selecting documents to import
 */
export async function openFilePicker(options?: {
  title?: string;
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string[] | null> {
  return await tauriOpenFilePicker({
    ...options,
    filters: options?.filters ?? [
      {
        name: "Supported Documents",
        extensions: [
          "pdf",
          "epub",
          "md",
          "markdown",
          "html",
          "htm",
          "mp3",
          "wav",
          "m4a",
          "aac",
          "ogg",
          "flac",
          "opus",
          "mp4",
          "webm",
          "mov",
          "mkv",
          "avi",
          "m4v",
        ],
      },
      {
        name: "PDF",
        extensions: ["pdf"],
      },
      {
        name: "EPUB",
        extensions: ["epub"],
      },
      {
        name: "Markdown",
        extensions: ["md", "markdown"],
      },
      {
        name: "HTML",
        extensions: ["html", "htm"],
      },
    ],
  });
}

/**
 * Open folder picker dialog for bulk import
 */
export async function openFolderPicker(options?: {
  title?: string;
}): Promise<string | null> {
  return await tauriOpenFolderPicker(options);
}

/**
 * Result from fetching URL content
 */
export interface FetchedUrlContent {
  file_path: string;
  file_name: string;
  content_type: string;
}

/**
 * Fetch content from a URL and save it to a temporary location
 * Used for Arxiv PDF downloads and URL-based imports
 */
export async function fetchUrlContent(url: string): Promise<FetchedUrlContent> {
  if (isWebMode()) {
    return await browserInvoke<FetchedUrlContent>("fetch_url_content", { url });
  }
  return await invokeCommand<FetchedUrlContent>("fetch_url_content", { url });
}

/**
 * Import a YouTube video as a document
 */
export async function importYouTubeVideo(url: string): Promise<Document> {
  if (isWebMode()) {
    return await browserInvoke<Document>("import_youtube_video", { url });
  }
  return await invokeCommand<Document>("import_youtube_video", { url });
}

/**
 * Unified getDocument function that works in both Tauri and web mode
 */
export async function getDocumentAuto(id: string): Promise<any | null> {
  if (isWebMode()) {
    return await browserInvoke<Document | null>("get_document", { id });
  }
  return await invokeCommand<Document | null>("get_document", { id });
}

/**
 * Unified updateDocumentProgress function that works in both Tauri and web mode
 */
export async function updateDocumentProgressAuto(
  id: string,
  currentPage?: number | null,
  currentScrollPercent?: number | null,
  currentCfi?: string | null,
  currentViewState?: ViewState | string | null
): Promise<any> {
  const viewStatePayload = serializeViewState(currentViewState);

  if (isWebMode()) {
    return await browserInvoke<Document>("update_document_progress", {
      id,
      current_page: currentPage ?? null,
      current_scroll_percent: currentScrollPercent ?? null,
      current_cfi: currentCfi ?? null,
      current_view_state: viewStatePayload,
    });
  }

  return await invokeCommand<Document>("update_document_progress", {
    id,
    current_page: currentPage ?? null,
    current_scroll_percent: currentScrollPercent ?? null,
    current_cfi: currentCfi ?? null,
    current_view_state: viewStatePayload,
  });
}

/**
 * Result from PDF to HTML conversion
 */
export interface PdfToHtmlResult {
  /** The generated HTML content */
  html_content: string;
  /** Path where the HTML file was saved (if save_to_file was true) */
  saved_path: string | null;
  /** The original PDF filename */
  original_filename: string;
}

/**
 * Convert a PDF file to HTML format for better text selection and extraction
 * @param filePath Path to the PDF file
 * @param saveToFile Whether to save the HTML to a file
 * @param outputPath Custom output path (optional, defaults to same directory as PDF)
 */
export async function convertPdfToHtml(
  filePath: string,
  saveToFile?: boolean,
  outputPath?: string
): Promise<PdfToHtmlResult> {
  if (isWebMode()) {
    return await browserInvoke<PdfToHtmlResult>("convert_pdf_to_html", {
      file_path: filePath,
      save_to_file: saveToFile,
      output_path: outputPath,
    });
  }
  return await invokeCommand<PdfToHtmlResult>("convert_pdf_to_html", {
    file_path: filePath,
    save_to_file: saveToFile,
    output_path: outputPath,
  });
}

/**
 * Convert a PDF document by ID to HTML format
 * @param id Document ID
 * @param saveToFile Whether to save the HTML to a file
 * @param outputPath Custom output path (optional)
 */
export async function convertDocumentPdfToHtml(
  id: string,
  saveToFile?: boolean,
  outputPath?: string
): Promise<PdfToHtmlResult> {
  if (isWebMode()) {
    return await browserInvoke<PdfToHtmlResult>("convert_document_pdf_to_html", {
      id,
      save_to_file: saveToFile,
      output_path: outputPath,
    });
  }
  return await invokeCommand<PdfToHtmlResult>("convert_document_pdf_to_html", {
    id,
    save_to_file: saveToFile,
    output_path: outputPath,
  });
}
