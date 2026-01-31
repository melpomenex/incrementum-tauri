import JSZip from "jszip";
import { invokeCommand, isTauri } from "../lib/tauri";
import * as db from "../lib/database";
import { buildAnkiApkg } from "./ankiExport";
import type { Document, Extract, LearningItem } from "../types/document";
import type { Collection } from "../stores/collectionStore";
import type {
  ArchiveFileEntry,
  CollectionArchiveManifest,
  CollectionArchivePayload,
  CollectionExportScope,
  ParsedCollectionArchive,
} from "../types/archive";

function getFilenameFromPath(path: string, fallback: string): string {
  const trimmed = path.split("?")[0];
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || fallback;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function collectLocalStorage(): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }
  return data;
}

function buildScopeDocumentSet(
  scope: CollectionExportScope,
  activeCollectionId: string | null,
  documentAssignments: Record<string, string>,
  documents: Document[]
): Set<string> {
  if (scope === "all" || !activeCollectionId) {
    return new Set(documents.map((doc) => doc.id));
  }

  const ids = new Set<string>();
  for (const doc of documents) {
    const assigned = documentAssignments[doc.id];
    if (assigned === activeCollectionId) {
      ids.add(doc.id);
    }
  }
  return ids;
}

export async function buildCollectionArchive(options: {
  scope: CollectionExportScope;
  activeCollectionId: string | null;
  collections: Collection[];
  documentAssignments: Record<string, string>;
}): Promise<{ blob: Blob; filename: string }> {
  const documents = await invokeCommand<Document[]>("get_documents");
  const extracts = await invokeCommand<Extract[]>("get_extracts", {});
  const learningItems = await invokeCommand<LearningItem[]>("get_all_learning_items");

  const scopedDocIds = buildScopeDocumentSet(
    options.scope,
    options.activeCollectionId,
    options.documentAssignments,
    documents
  );

  const scopedDocuments = documents.filter((doc) => scopedDocIds.has(doc.id));
  const scopedExtracts = extracts.filter((extract) => scopedDocIds.has(extract.documentId));
  const scopedExtractIds = new Set(scopedExtracts.map((extract) => extract.id));
  const scopedLearningItems = learningItems.filter((item) => {
    if (item.documentId && scopedDocIds.has(item.documentId)) return true;
    if (item.extractId && scopedExtractIds.has(item.extractId)) return true;
    return false;
  });

  const zip = new JSZip();
  const files: ArchiveFileEntry[] = [];

  for (const doc of scopedDocuments) {
    if (!doc.filePath) continue;
    const base64 = await invokeCommand<string>("read_document_file", { filePath: doc.filePath });
    if (!base64) continue;
    const filename = getFilenameFromPath(doc.filePath, `${doc.id}.bin`);
    const zipPath = `files/${doc.id}/${filename}`;
    const bytes = base64ToBytes(base64);
    zip.file(zipPath, bytes);
    files.push({
      documentId: doc.id,
      filename,
      contentType: doc.fileType ? `application/${doc.fileType}` : undefined,
      zipPath,
      size: bytes.byteLength,
    });
  }

  const deckName = options.scope === "all"
    ? "Incrementum Export"
    : options.collections.find((c) => c.id === options.activeCollectionId)?.name || "Incrementum Export";
  const apkgBytes = await buildAnkiApkg(scopedLearningItems, { deckName });
  zip.file("anki/flashcards.apkg", apkgBytes);

  const settingsRaw = localStorage.getItem("incrementum-settings");
  const settings = settingsRaw ? JSON.parse(settingsRaw) : null;

  const localStorageDump = collectLocalStorage();

  const collectionsPayload =
    options.scope === "all"
      ? {
        collections: options.collections,
        activeCollectionId: options.activeCollectionId,
        documentAssignments: options.documentAssignments,
      }
      : {
        collections: options.collections.filter((c) => c.id === options.activeCollectionId),
        activeCollectionId: options.activeCollectionId,
        documentAssignments: Object.fromEntries(
          Object.entries(options.documentAssignments).filter(([docId]) => scopedDocIds.has(docId))
        ),
      };

  const payload: CollectionArchivePayload = {
    documents: scopedDocuments,
    extracts: scopedExtracts,
    learningItems: scopedLearningItems,
    files,
    collections: collectionsPayload,
    settings,
    localStorage: localStorageDump,
  };

  const manifest: CollectionArchiveManifest = {
    archiveType: "incrementum-collection-export",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    scope: options.scope,
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("data/payload.json", JSON.stringify(payload, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().split("T")[0];
  const scopeLabel = options.scope === "all" ? "all" : "collection";
  const filename = `incrementum-${scopeLabel}-export-${date}.zip`;

  return { blob, filename };
}

export async function parseCollectionArchive(file: File): Promise<ParsedCollectionArchive> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const manifestRaw = await zip.file("manifest.json")?.async("string");
  if (!manifestRaw) {
    throw new Error("Archive manifest not found.");
  }
  const manifest = JSON.parse(manifestRaw) as CollectionArchiveManifest;
  if (manifest.archiveType !== "incrementum-collection-export") {
    throw new Error("Unsupported archive type.");
  }
  const payloadRaw = await zip.file("data/payload.json")?.async("string");
  if (!payloadRaw) {
    throw new Error("Archive payload missing.");
  }
  const payload = JSON.parse(payloadRaw) as CollectionArchivePayload;

  const files: ParsedCollectionArchive["files"] = [];
  for (const entry of payload.files) {
    const fileBlob = await zip.file(entry.zipPath)?.async("blob");
    if (!fileBlob) continue;
    files.push({ entry, blob: fileBlob });
  }

  return { manifest, payload, files };
}

export function restoreLocalStorage(data: Record<string, string>): void {
  localStorage.clear();
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

export async function restoreBrowserArchive(parsed: ParsedCollectionArchive): Promise<void> {
  const filesToStore: db.StoredFile[] = [];
  const filePathByDocument: Record<string, string> = {};

  for (const { entry, blob } of parsed.files) {
    const filePath = `archive-file://${entry.documentId}/${entry.filename}`;
    const file = new File([blob], entry.filename, {
      type: entry.contentType || "application/octet-stream",
    });
    filesToStore.push({
      id: filePath,
      filename: entry.filename,
      content_type: entry.contentType || file.type,
      blob: file,
      created_at: new Date().toISOString(),
    });
    filePathByDocument[entry.documentId] = filePath;
  }

  const documents = (parsed.payload.documents as Document[]).map((doc) => {
    const replacementPath = filePathByDocument[doc.id];
    if (!replacementPath) return doc;
    return { ...doc, filePath: replacementPath };
  });

  const extracts = parsed.payload.extracts as Extract[];
  const learningItems = parsed.payload.learningItems as LearningItem[];

  await db.clearStore("documents");
  await db.clearStore("extracts");
  await db.clearStore("learning_items");
  await db.clearStore("files");

  await db.bulkPutDocuments(documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    file_path: doc.filePath,
    file_type: doc.fileType,
    content: doc.content,
    content_hash: doc.contentHash,
    total_pages: doc.totalPages,
    current_page: doc.currentPage || 1,
    current_scroll_percent: doc.currentScrollPercent,
    current_cfi: doc.currentCfi,
    current_view_state: doc.currentViewState,
    position_json: doc.positionJson,
    progress_percent: doc.progressPercent,
    category: doc.category,
    tags: doc.tags || [],
    date_added: doc.dateAdded,
    date_modified: doc.dateModified,
    date_last_reviewed: doc.dateLastReviewed,
    extract_count: doc.extractCount,
    learning_item_count: doc.learningItemCount,
    priority_rating: doc.priorityRating,
    priority_slider: doc.prioritySlider,
    priority_score: doc.priorityScore,
    is_archived: doc.isArchived,
    is_favorite: doc.isFavorite,
    metadata: doc.metadata,
    cover_image_url: doc.coverImageUrl,
    cover_image_source: doc.coverImageSource,
    next_reading_date: doc.nextReadingDate,
    reading_count: doc.readingCount,
    stability: doc.stability,
    difficulty: doc.difficulty,
    reps: doc.reps,
    total_time_spent: doc.totalTimeSpent,
  } as db.Document)));

  await db.bulkPutExtracts(extracts.map((extract) => ({
    id: extract.id,
    document_id: extract.documentId,
    content: extract.content,
    html_content: (extract as Extract & { htmlContent?: string }).htmlContent,
    source_url: (extract as Extract & { sourceUrl?: string }).sourceUrl,
    page_title: extract.pageTitle,
    page_number: extract.pageNumber,
    selection_context: extract.selectionContext,
    highlight_color: extract.highlightColor,
    notes: extract.notes,
    progressive_disclosure_level: extract.progressiveDisclosureLevel,
    max_disclosure_level: extract.maxDisclosureLevel,
    date_created: extract.dateCreated,
    date_modified: extract.dateModified,
    tags: extract.tags || [],
    category: extract.category,
    memory_state: (extract as any).memoryState,
    next_review_date: (extract as any).nextReviewDate,
    last_review_date: (extract as any).lastReviewDate,
    review_count: (extract as any).reviewCount ?? 0,
    reps: (extract as any).reps ?? 0,
  } as db.Extract)));

  await db.bulkPutLearningItems(learningItems.map((item) => ({
    id: item.id,
    extract_id: item.extractId,
    document_id: item.documentId,
    item_type: item.itemType,
    question: item.question,
    answer: item.answer,
    cloze_text: item.clozeText,
    cloze_ranges: item.clozeRanges,
    difficulty: item.difficulty,
    interval: item.interval,
    ease_factor: item.easeFactor,
    due_date: item.dueDate,
    date_created: item.dateCreated,
    date_modified: item.dateModified,
    last_review_date: item.lastReviewDate,
    review_count: item.reviewCount,
    lapses: item.lapses,
    state: item.state,
    is_suspended: item.isSuspended,
    tags: item.tags || [],
    memory_state: (item as any).memoryState,
  } as db.LearningItem)));

  if (filesToStore.length > 0) {
    await db.bulkPutFiles(filesToStore);
  }
}

export function shouldUseTauriImport(file: File): boolean {
  const filePath = (file as File & { path?: string }).path;
  return isTauri() && Boolean(filePath);
}
