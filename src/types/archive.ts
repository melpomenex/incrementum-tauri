export type CollectionExportScope = "current" | "all";

export interface CollectionArchiveManifest {
  archiveType: "incrementum-collection-export";
  version: "1.0";
  exportedAt: string;
  scope: CollectionExportScope;
}

export interface ArchiveFileEntry {
  documentId: string;
  filename: string;
  contentType?: string;
  zipPath: string;
  size: number;
}

export interface CollectionArchivePayload {
  documents: unknown[];
  extracts: unknown[];
  learningItems: unknown[];
  files: ArchiveFileEntry[];
  collections: {
    collections: unknown[];
    activeCollectionId: string | null;
    documentAssignments: Record<string, string>;
  };
  settings: Record<string, unknown> | null;
  localStorage: Record<string, string>;
}

export interface ParsedCollectionArchive {
  manifest: CollectionArchiveManifest;
  payload: CollectionArchivePayload;
  files: Array<{
    entry: ArchiveFileEntry;
    blob: Blob;
  }>;
}
