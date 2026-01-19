/**
 * Tauri API wrapper for document commands
 */

import { invokeCommand, openFilePicker as tauriOpenFilePicker, openFolderPicker as tauriOpenFolderPicker } from "../lib/tauri";
import { Document } from "../types/document";

export async function getDocuments(): Promise<Document[]> {
  return await invokeCommand<Document[]>("get_documents");
}

export async function getDocument(id: string): Promise<Document | null> {
  return await invokeCommand<Document | null>("get_document", { id });
}

export async function createDocument(
  title: string,
  filePath: string,
  fileType: string
): Promise<Document> {
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
  return await invokeCommand<Document>("update_document", { id, updates });
}

export async function updateDocumentContent(
  id: string,
  content: string
): Promise<Document> {
  return await invokeCommand<Document>("update_document_content", { id, content });
}

export async function updateDocumentPriority(
  id: string,
  rating: number,
  slider: number
): Promise<Document> {
  return await invokeCommand<Document>("update_document_priority", { id, rating, slider });
}

export async function deleteDocument(id: string): Promise<void> {
  await invokeCommand("delete_document", { id });
}

export async function importDocument(filePath: string): Promise<Document> {
  return await invokeCommand<Document>("import_document", { filePath });
}

export async function importDocuments(filePaths: string[]): Promise<Document[]> {
  return await invokeCommand<Document[]>("import_documents", { filePaths });
}

/**
 * Read document file contents as base64
 * Used for loading PDFs, EPUBs, etc. in the viewer
 */
export async function readDocumentFile(filePath: string): Promise<string> {
  return await invokeCommand<string>("read_document_file", { filePath });
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
        extensions: ["pdf", "epub", "md", "markdown", "html", "htm"],
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
  return await invokeCommand<FetchedUrlContent>("fetch_url_content", { url });
}

/**
 * Import a YouTube video as a document
 */
export async function importYouTubeVideo(url: string): Promise<Document> {
  return await invokeCommand<Document>("import_youtube_video", { url });
}

// ============================================================================
// HTTP API Functions (for Web Browser App)
// ============================================================================

/**
 * Get the base URL for HTTP API calls
 */
function getApiBaseUrl(): string {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:8766`
    : `${window.location.protocol}//${window.location.hostname}`;
}

/**
 * Check if running in web mode (not Tauri)
 */
function isWebMode(): boolean {
  return !("__TAURI__" in window);
}

/**
 * HTTP-based document operations for web mode
 */

/**
 * Get document by ID via HTTP API
 */
export async function getDocumentHttp(id: string): Promise<any | null> {
  const response = await fetch(`${getApiBaseUrl()}/api/documents/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to get document: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update document progress via HTTP API
 */
export async function updateDocumentProgressHttp(
  id: string,
  currentPage?: number | null,
  currentScrollPercent?: number | null,
  currentCfi?: string | null
): Promise<any> {
  const response = await fetch(`${getApiBaseUrl()}/api/documents/${id}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_page: currentPage ?? null,
      current_scroll_percent: currentScrollPercent ?? null,
      current_cfi: currentCfi ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update progress: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Unified getDocument function that works in both Tauri and web mode
 */
export async function getDocumentAuto(id: string): Promise<any | null> {
  if (isWebMode()) {
    return await getDocumentHttp(id);
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
  currentCfi?: string | null
): Promise<any> {
  return await invokeCommand<Document>("update_document_progress", {
    id,
    current_page: currentPage ?? null,
    current_scroll_percent: currentScrollPercent ?? null,
    current_cfi: currentCfi ?? null,
  });
}
