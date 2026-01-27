import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, List, Search, X, Youtube, LayoutGrid, BookOpen, Trash2, FileText } from "lucide-react";
import { useDocumentStore } from "../../stores/documentStore";
import { useCollectionStore } from "../../stores/collectionStore";
import { AnnaArchiveSearch } from "../import/AnnaArchiveSearch";
import { EmptyDocuments, EmptySearch } from "../common/EmptyState";
import { DocumentCardSkeleton, DocumentGridSkeleton } from "../common/Skeleton";
import type { Document } from "../../types/document";
import {
  DocumentSortDirection,
  DocumentSortKey,
  DocumentViewMode,
  SMART_SECTION_LABELS,
  formatRelativeTime,
  getLastTouched,
  getNextAction,
  getPriorityReason,
  getPrioritySignal,
  getPriorityTier,
  getProgressSegments,
  getSmartSection,
  matchesDocumentSearch,
  parseDocumentSearch,
  sortDocuments,
} from "../../utils/documentsView";
import { importYouTubeVideo, resolveDocumentCover } from "../../api/documents";
import { getYouTubeThumbnail } from "../../api/youtube";
import { getDeviceInfo } from "../../lib/pwa";
import { isTauri } from "../../lib/tauri";

const MODE_STORAGE_KEY = "documentsViewMode";
const SAVED_VIEWS_KEY = "documentsSavedViews";
const MAX_VISIBLE_TAGS = 3;

function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function getDocumentCoverUrl(doc: Document): string | null {
  if (doc.coverImageUrl) return doc.coverImageUrl;
  if (doc.fileType === "youtube") {
    const videoId = extractYouTubeId(doc.filePath ?? "");
    return videoId ? getYouTubeThumbnail(videoId) : null;
  }
  return null;
}

function getCoverFallbackIcon(fileType: Document["fileType"]) {
  if (fileType === "youtube") return Youtube;
  if (fileType === "pdf") return FileText;
  return BookOpen;
}

type SavedView = {
  id: string;
  name: string;
  query: string;
  sortKey: DocumentSortKey;
  sortDirection: DocumentSortDirection;
  mode: DocumentViewMode;
  showNextAction: boolean;
};

const defaultSortByKey: Record<DocumentSortKey, DocumentSortDirection> = {
  priority: "desc",
  lastTouched: "desc",
  added: "desc",
  title: "asc",
  type: "asc",
  extracts: "desc",
  cards: "desc",
};

interface DocumentsViewProps {
  onOpenDocument?: (doc: Document) => void;
  enableYouTubeImport?: boolean;
}

export function DocumentsView({ onOpenDocument, enableYouTubeImport = true }: DocumentsViewProps) {
  const {
    documents,
    isLoading,
    isImporting,
    importProgress,
    error,
    loadDocuments,
    openFilePickerAndImport,
    importFromFiles,
    updateDocument,
    deleteDocument,
  } = useDocumentStore();
  const activeCollectionId = useCollectionStore((state) => state.activeCollectionId);
  const documentAssignments = useCollectionStore((state) => state.documentAssignments);
  const collections = useCollectionStore((state) => state.collections);
  const assignDocument = useCollectionStore((state) => state.assignDocument);
  const createCollection = useCollectionStore((state) => state.createCollection);

  const [mode, setMode] = useState<DocumentViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return stored === "list" ? "list" : "grid";
  });
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<DocumentSortKey>("priority");
  const [sortDirection, setSortDirection] = useState<DocumentSortDirection>("desc");
  const [showNextAction, setShowNextAction] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;
  const [isInspectorOpen, setInspectorOpen] = useState(() => !isMobile);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [isDragging, setIsDragging] = useState(false);
  const [showYouTubeImport, setShowYouTubeImport] = useState(false);
  const [showAnnaArchiveSearch, setShowAnnaArchiveSearch] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(SAVED_VIEWS_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as SavedView[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const coverResolutionQueue = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 100);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
    }
  }, [savedViews]);

  const searchTokens = useMemo(() => parseDocumentSearch(debouncedSearch), [debouncedSearch]);
  const filteredDocuments = useMemo(() => {
    const base = documents.filter((doc) => matchesDocumentSearch(doc, searchTokens));
    if (!activeCollectionId) return base;
    return base.filter((doc) => {
      const assigned = documentAssignments[doc.id];
      return assigned ? assigned === activeCollectionId : true;
    });
  }, [documents, searchTokens, activeCollectionId, documentAssignments]);

  const sortedDocuments = useMemo(() => {
    return sortDocuments(filteredDocuments, sortKey, sortDirection);
  }, [filteredDocuments, sortKey, sortDirection]);

  useEffect(() => {
    if (!isTauri() || mode !== "grid") return;

    const pendingDocs = sortedDocuments.filter((doc) => {
      if (doc.coverImageUrl || doc.coverImageSource === "fallback") return false;
      return !coverResolutionQueue.current.has(doc.id);
    });

    if (pendingDocs.length === 0) return;

    pendingDocs.forEach((doc) => {
      coverResolutionQueue.current.add(doc.id);
      resolveDocumentCover(doc.id)
        .then((updated) => {
          if (updated) {
            updateDocument(doc.id, {
              coverImageUrl: updated.coverImageUrl,
              coverImageSource: updated.coverImageSource,
            });
          }
          coverResolutionQueue.current.delete(doc.id);
        })
        .catch((error) => {
          console.warn(`Failed to resolve cover for document ${doc.id}:`, error);
          coverResolutionQueue.current.delete(doc.id);
        });
    });
  }, [mode, sortedDocuments, updateDocument]);

  const sectionedDocuments = useMemo(() => {
    const sections: Record<string, Document[]> = {};
    for (const doc of sortedDocuments) {
      const section = getSmartSection(doc);
      if (!sections[section]) sections[section] = [];
      sections[section].push(doc);
    }
    return sections;
  }, [sortedDocuments]);

  useEffect(() => {
    const visibleIds = new Set(sortedDocuments.map((doc) => doc.id));
    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => visibleIds.has(id))));
    if (activeId && !visibleIds.has(activeId)) {
      setActiveId(sortedDocuments[0]?.id ?? null);
    }
  }, [sortedDocuments, activeId]);

  const handleImport = useCallback(async () => {
    try {
      await openFilePickerAndImport();
    } catch (err) {
      console.error("Failed to import documents:", err);
    }
  }, [openFilePickerAndImport]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;
      const filePaths = files
        .map((file) => (file as any).path)
        .filter((path) => path && typeof path === "string");

      if (filePaths.length === 0) return;
      try {
        await importFromFiles(filePaths);
      } catch (err) {
        console.error("Failed to import dropped files:", err);
      }
    },
    [importFromFiles]
  );

  const handleYouTubeImport = async () => {
    if (!youtubeUrl.trim()) {
      setYoutubeError("Please enter a YouTube URL");
      return;
    }
    setYoutubeLoading(true);
    setYoutubeError(null);
    try {
      const document = await importYouTubeVideo(youtubeUrl.trim());
      await loadDocuments();
      setShowYouTubeImport(false);
      setYoutubeUrl("");
      if (onOpenDocument) {
        onOpenDocument(document);
      }
    } catch (err) {
      setYoutubeError(err instanceof Error ? err.message : "Failed to import YouTube video");
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleSelectRow = (doc: Document, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(doc.id)) {
          next.delete(doc.id);
        } else {
          next.add(doc.id);
        }
        return next;
      });
    } else {
      setSelectedIds(new Set([doc.id]));
    }
    setActiveId(doc.id);
  };

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => {
      updateDocument(id, { isArchived: true });
    });
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.size} document(s)? This cannot be undone.`);
    if (!confirmed) return;
    for (const id of selectedIds) {
      await deleteDocument(id);
    }
    setSelectedIds(new Set());
    setActiveId(null);
  };

  const handleDeleteDocument = async (doc: Document) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${doc.title}"? This cannot be undone.`);
    if (!confirmed) return;
    await deleteDocument(doc.id);
    if (activeId === doc.id) {
      setActiveId(null);
    }
  };

  const handleBulkTag = () => {
    if (selectedIds.size === 0) return;
    const tag = window.prompt("Add tag to selected documents:");
    if (!tag) return;
    selectedIds.forEach((id) => {
      const doc = documents.find((item) => item.id === id);
      if (!doc) return;
      const nextTags = new Set(doc.tags);
      nextTags.add(tag);
      updateDocument(id, { tags: Array.from(nextTags) });
    });
  };

  const handleBulkReprioritize = () => {
    if (selectedIds.size === 0) return;
    const value = window.prompt("Set priority rating (0-5) for selected documents:");
    if (!value) return;
    const nextRating = Number(value);
    if (Number.isNaN(nextRating)) return;
    selectedIds.forEach((id) => {
      updateDocument(id, { priorityRating: nextRating, priorityScore: nextRating * 20 });
    });
  };

  const handleBulkMoveCollection = () => {
    if (selectedIds.size === 0) return;
    const names = collections.map((collection) => collection.name).join(", ");
    const targetName = window.prompt(`Move to collection (available: ${names}):`);
    if (!targetName) return;
    const existing = collections.find((collection) => collection.name.toLowerCase() === targetName.toLowerCase());
    const target = existing ?? createCollection(targetName);
    selectedIds.forEach((id) => {
      assignDocument(id, target.id);
    });
    setSelectedIds(new Set());
  };

  const handleSort = (key: DocumentSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection(defaultSortByKey[key]);
  };

  const activeDocument = useMemo(
    () => sortedDocuments.find((doc) => doc.id === activeId) ?? null,
    [sortedDocuments, activeId]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        setInspectorOpen((prev) => !prev);
        return;
      }

      if (mode === "list" && (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k")) {
        event.preventDefault();
        if (sortedDocuments.length === 0) return;
        const currentIndex = sortedDocuments.findIndex((doc) => doc.id === activeId);
        const delta = event.key.toLowerCase() === "j" ? 1 : -1;
        const nextIndex = currentIndex === -1 ? 0 : Math.min(sortedDocuments.length - 1, Math.max(0, currentIndex + delta));
        const nextDoc = sortedDocuments[nextIndex];
        setActiveId(nextDoc.id);
        setSelectedIds(new Set([nextDoc.id]));
        return;
      }

      if (event.key === "Enter") {
        const doc = activeDocument ?? sortedDocuments[0];
        if (doc && onOpenDocument) {
          onOpenDocument(doc);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeDocument, activeId, mode, onOpenDocument, sortedDocuments]);

  const handleSaveView = () => {
    const name = window.prompt("Name this view:");
    if (!name) return;
    const view: SavedView = {
      id: `${Date.now()}`,
      name,
      query: searchInput,
      sortKey,
      sortDirection,
      mode,
      showNextAction,
    };
    setSavedViews((prev) => [...prev, view]);
    setActiveViewId(view.id);
  };

  const handleApplyView = (viewId: string) => {
    if (!viewId) {
      setActiveViewId(null);
      return;
    }
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    setSearchInput(view.query);
    setDebouncedSearch(view.query);
    setSortKey(view.sortKey);
    setSortDirection(view.sortDirection);
    setMode(view.mode);
    setShowNextAction(view.showNextAction);
    setActiveViewId(view.id);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div
      className={`h-full flex flex-col bg-cream ${isDragging ? "bg-primary/10" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex flex-col items-start justify-between gap-3 mb-4 md:flex-row md:items-start md:gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {sortedDocuments.length} documents • prioritize your next action
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            {enableYouTubeImport && (
              <button
                onClick={() => setShowYouTubeImport(true)}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                title="Import YouTube video"
              >
                <Youtube className="w-4 h-4" />
                Import YouTube
              </button>
            )}
            <button
              onClick={() => setShowAnnaArchiveSearch(true)}
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
              title="Search and download books from Anna's Archive"
            >
              <BookOpen className="w-4 h-4" />
              Anna's Archive
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
            >
              {isImporting ? "Importing..." : "Import Document"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/40 rounded-md p-1">
            <button
              onClick={() => setMode("grid")}
              className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                mode === "grid" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </button>
            <button
              onClick={() => setMode("list")}
              className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                mode === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
          <button
            onClick={() => setInspectorOpen((prev) => !prev)}
            className="px-3 py-2 bg-muted text-foreground rounded-md text-sm hover:bg-muted/80"
          >
            {isInspectorOpen ? "Hide Inspector" : "Show Inspector"}
          </button>

          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search documents or use tag:History extracts=0"
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeViewId ?? ""}
              onChange={(event) => handleApplyView(event.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground"
            >
              <option value="">Saved Views</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveView}
              className="px-3 py-2 bg-muted text-foreground rounded-md text-sm hover:bg-muted/80"
            >
              Save View
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          {error}
        </div>
      )}

      {isImporting && importProgress.total > 0 && (
        <div className="mx-4 mt-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {importProgress.fileName ? `Importing ${importProgress.fileName}...` : "Importing documents..."}
            </span>
            <span className="text-sm text-muted-foreground">
              {importProgress.current} / {importProgress.total}
            </span>
          </div>
          <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mx-4 mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md flex items-center justify-between">
          <span className="text-sm text-primary">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkTag}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground hover:bg-muted"
            >
              Tag
            </button>
            <button
              onClick={handleBulkMoveCollection}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground hover:bg-muted"
            >
              Move
            </button>
            <button
              onClick={handleBulkReprioritize}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground hover:bg-muted"
            >
              Reprioritize
            </button>
            <button
              onClick={handleBulkArchive}
              className="px-3 py-1.5 bg-muted text-foreground rounded text-sm hover:bg-muted/80"
            >
              Archive
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-sm hover:opacity-90 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden documents-layout">
        <div className="flex-1 overflow-auto p-4 documents-content">
          {isLoading ? (
            mode === "list" ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <DocumentCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <DocumentGridSkeleton count={8} />
            )
          ) : sortedDocuments.length === 0 ? (
            debouncedSearch ? (
              <EmptySearch 
                query={debouncedSearch} 
                onClear={() => setSearchInput("")} 
              />
            ) : (
              <EmptyDocuments onImport={handleImport} />
            )
          ) : mode === "list" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-3">
                <div className="flex items-center gap-4">
                  <button onClick={() => handleSort("priority")} className="hover:text-foreground">
                    Priority
                  </button>
                  <button onClick={() => handleSort("title")} className="hover:text-foreground">
                    Title
                  </button>
                  <button onClick={() => handleSort("added")} className="hover:text-foreground">
                    Added
                  </button>
                  <button onClick={() => handleSort("type")} className="hover:text-foreground">
                    Type
                  </button>
                  <button onClick={() => handleSort("extracts")} className="hover:text-foreground">
                    Extracts
                  </button>
                  <button onClick={() => handleSort("cards")} className="hover:text-foreground">
                    Cards
                  </button>
                  <button onClick={() => handleSort("lastTouched")} className="hover:text-foreground">
                    Last Touched
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showNextAction}
                    onChange={(event) => setShowNextAction(event.target.checked)}
                  />
                  Next Action
                </label>
              </div>

              <div className="space-y-2">
                {sortedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={(event) => {
                      if (isMobile) {
                        onOpenDocument?.(doc);
                        return;
                      }
                      handleSelectRow(doc, event.metaKey || event.ctrlKey);
                      if (event.detail > 1) {
                        onOpenDocument?.(doc);
                      }
                    }}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedIds.has(doc.id) ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(doc.id)}
                        onChange={(event) => {
                          event.stopPropagation();
                          handleSelectRow(doc, true);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <PriorityBadge doc={doc} />
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">{doc.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{getPriorityReason(doc)}</div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(getLastTouched(doc))}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">{doc.fileType}</span>
                          <ProgressBar doc={doc} />
                          {showNextAction && (
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{getNextAction(doc)}</span>
                          )}
                          <TagsInline tags={doc.tags} />
                        </div>
                        {isMobile && (
                          <div className="mt-3">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenDocument?.(doc);
                              }}
                              className="px-3 py-2 bg-primary text-primary-foreground rounded text-xs mobile-density-tap"
                            >
                              Open / Read
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(SMART_SECTION_LABELS).map(([sectionId, label]) => {
                const docs = sectionedDocuments[sectionId] ?? [];
                if (docs.length === 0) return null;
                const isCollapsed = collapsedSections[sectionId];
                return (
                  <div key={sectionId} className="bg-card border border-border rounded-lg">
                    <button
                      onClick={() => toggleSection(sectionId)}
                      className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-foreground"
                    >
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {isCollapsed ? "Show" : "Hide"} ({docs.length})
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                        {docs.map((doc) => {
                          const coverUrl = getDocumentCoverUrl(doc);
                          const CoverIcon = getCoverFallbackIcon(doc.fileType);
                          return (
                            <div
                              key={doc.id}
                              onClick={(event) => {
                                if (isMobile) {
                                  onOpenDocument?.(doc);
                                  return;
                                }
                                handleSelectRow(doc, event.metaKey || event.ctrlKey);
                                if (event.detail > 1) {
                                  onOpenDocument?.(doc);
                                }
                              }}
                              className={`p-2 rounded-md border transition-shadow cursor-pointer ${
                                selectedIds.has(doc.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-background hover:shadow-md"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(doc.id)}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    handleSelectRow(doc, true);
                                  }}
                                />
                              <span className="text-[10px] text-muted-foreground">{formatRelativeTime(getLastTouched(doc))}</span>
                              </div>
                              <div className="mt-2 overflow-hidden rounded border border-border/60 bg-muted/40">
                                <div className="aspect-[2/3] w-full">
                                  {coverUrl ? (
                                    <img
                                      src={coverUrl}
                                      alt={doc.title}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
                                      <CoverIcon className="w-6 h-6 text-muted-foreground/70" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <PriorityBadge doc={doc} />
                                <span className="text-[10px] text-muted-foreground">{getPriorityReason(doc)}</span>
                              </div>
                              <h3 className="mt-1 text-xs font-semibold text-foreground line-clamp-2">{doc.title}</h3>
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">{doc.fileType}</span>
                                <ProgressBar doc={doc} />
                              </div>
                              <div className="mt-1">
                                <TagsInline tags={doc.tags} />
                              </div>
                              {isMobile && (
                                <div className="mt-3">
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onOpenDocument?.(doc);
                                    }}
                                    className="px-3 py-2 bg-primary text-primary-foreground rounded text-xs mobile-density-tap"
                                  >
                                    Open / Read
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isInspectorOpen && (
          <aside className="w-80 border-l border-border bg-card p-4 overflow-auto documents-inspector">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
              <button
                onClick={() => setInspectorOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {!activeDocument ? (
              <div className="text-sm text-muted-foreground">
                Select a document to see details.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Title</div>
                  <div className="text-sm font-semibold text-foreground">{activeDocument.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{activeDocument.fileType}</div>
                </div>

                <div className="flex items-center gap-2">
                  <PriorityBadge doc={activeDocument} />
                  <span className="text-xs text-muted-foreground">{getPriorityReason(activeDocument)}</span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>Added: {formatRelativeTime(activeDocument.dateAdded)}</div>
                  <div>Last touched: {formatRelativeTime(getLastTouched(activeDocument))}</div>
                  <div>Created: {formatRelativeTime(activeDocument.metadata?.createdAt)}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Progress</div>
                  <ProgressBar doc={activeDocument} />
                  <div className="text-xs text-muted-foreground mt-2">
                    {activeDocument.extractCount} extracts • {activeDocument.learningItemCount} cards
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {activeDocument.tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No tags</span>
                    ) : (
                      activeDocument.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                        >
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Actions</div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onOpenDocument?.(activeDocument)}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm"
                    >
                      Open / Read
                    </button>
                    <button
                      onClick={() => onOpenDocument?.(activeDocument)}
                      className="px-3 py-2 bg-background border border-border rounded text-sm text-foreground"
                    >
                      Extract
                    </button>
                    <button
                      onClick={() =>
                        updateDocument(activeDocument.id, {
                          priorityRating: (activeDocument.priorityRating ?? 0) + 1,
                          priorityScore: (activeDocument.priorityScore ?? 0) + 10,
                        })
                      }
                      className="px-3 py-2 bg-background border border-border rounded text-sm text-foreground"
                    >
                      Reprioritize
                    </button>
                    <button
                      onClick={() => updateDocument(activeDocument.id, { isArchived: true })}
                      className="px-3 py-2 bg-muted text-foreground rounded text-sm hover:bg-muted/80"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(activeDocument)}
                      className="px-3 py-2 bg-destructive text-destructive-foreground rounded text-sm hover:opacity-90 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Related items</div>
                  <div className="text-xs text-muted-foreground">No related items available.</div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm pointer-events-none">
          <div className="text-center p-8 bg-card border-2 border-primary rounded-lg shadow-lg">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Drop files to import
            </h3>
            <p className="text-muted-foreground">
              Release to import documents
            </p>
          </div>
        </div>
      )}

      {enableYouTubeImport && showYouTubeImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-foreground">Import YouTube Video</h2>
              </div>
              <button
                onClick={() => {
                  setShowYouTubeImport(false);
                  setYoutubeUrl("");
                  setYoutubeError(null);
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={youtubeLoading}
                />
              </div>

              {youtubeError && (
                <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-lg text-sm">
                  {youtubeError}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Note: yt-dlp must be installed for YouTube import to work
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowYouTubeImport(false);
                    setYoutubeUrl("");
                    setYoutubeError(null);
                  }}
                  disabled={youtubeLoading}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleYouTubeImport}
                  disabled={youtubeLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {youtubeLoading ? "Importing..." : "Import"}
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnnaArchiveSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <AnnaArchiveSearch
              onImportComplete={(path) => {
                // After download, trigger document import from the downloaded path
                loadDocuments();
                setShowAnnaArchiveSearch(false);
              }}
              onClose={() => setShowAnnaArchiveSearch(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ doc }: { doc: Document }) {
  const tier = getPriorityTier(doc);
  const signal = getPrioritySignal(doc);
  const tierStyles =
    tier === "high"
      ? "bg-red-500/15 text-red-600"
      : tier === "medium"
      ? "bg-amber-500/15 text-amber-600"
      : "bg-emerald-500/15 text-emerald-600";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tierStyles}`}>
      {signal}
    </span>
  );
}

function ProgressBar({ doc }: { doc: Document }) {
  const { extracts, cards, total, extractRatio, cardRatio } = getProgressSegments(doc);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-24 bg-muted/60 rounded-full overflow-hidden">
        <div className="absolute left-0 top-0 h-full bg-primary/70" style={{ width: `${extractRatio * 100}%` }} />
        {total > 0 && (
          <div
            className="absolute top-0 h-full bg-foreground/30"
            style={{ width: `${cardRatio * 100}%`, left: `${extractRatio * 100}%` }}
          />
        )}
      </div>
      <span className="text-[11px] text-muted-foreground">
        {extracts} / {cards}
      </span>
    </div>
  );
}

function TagsInline({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) {
    return <span className="text-xs text-muted-foreground">No tags</span>;
  }
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const remaining = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <span key={tag} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
          {tag}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
          +{remaining}
        </span>
      )}
    </div>
  );
}
