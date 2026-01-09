/**
 * Tauri API wrapper for document commands
 */

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Document } from "../types/document";

export async function getDocuments(): Promise<Document[]> {
  return await invoke<Document[]>("get_documents");
}

export async function getDocument(id: string): Promise<Document | null> {
  return await invoke<Document | null>("get_document", { id });
}

export async function createDocument(
  title: string,
  filePath: string,
  fileType: string
): Promise<Document> {
  return await invoke<Document>("create_document", {
    title,
    filePath,
    fileType,
  });
}

export async function updateDocument(
  id: string,
  updates: Document
): Promise<Document> {
  return await invoke<Document>("update_document", { id, updates });
}

export async function updateDocumentPriority(
  id: string,
  rating: number,
  slider: number
): Promise<Document> {
  return await invoke<Document>("update_document_priority", { id, rating, slider });
}

export async function deleteDocument(id: string): Promise<void> {
  await invoke("delete_document", { id });
}

export async function importDocument(filePath: string): Promise<Document> {
  return await invoke<Document>("import_document", { filePath });
}

export async function importDocuments(filePaths: string[]): Promise<Document[]> {
  return await invoke<Document[]>("import_documents", { filePaths });
}

/**
 * Read document file contents as base64
 * Used for loading PDFs, EPUBs, etc. in the viewer
 */
export async function readDocumentFile(filePath: string): Promise<string> {
  return await invoke<string>("read_document_file", { filePath });
}

/**
 * Open file picker dialog for selecting documents to import
 */
export async function openFilePicker(options?: {
  title?: string;
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string[] | null> {
  const selected = await open({
    title: options?.title ?? "Select Documents",
    multiple: options?.multiple ?? false,
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

  if (selected === null) return null;

  // Always return an array for consistency
  return Array.isArray(selected) ? selected : [selected];
}

/**
 * Open folder picker dialog for bulk import
 */
export async function openFolderPicker(options?: {
  title?: string;
}): Promise<string | null> {
  const selected = await open({
    title: options?.title ?? "Select Folder",
    directory: true,
  });

  return selected;
}
