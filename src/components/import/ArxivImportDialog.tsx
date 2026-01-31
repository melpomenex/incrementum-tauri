/**
 * ArXiv Import Dialog
 * 
 * Search and download ArXiv papers with category filtering.
 * Provides a polished import experience matching the browser extension flow.
 */

import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  Search,
  ExternalLink,
  Download,
  Bookmark,
  BookmarkCheck,
  Loader2,
  BookOpen,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../utils";
import {
  ArxivPaper,
  searchArxiv,
  getArxivCategoryPapers,
  getSavedPapers,
  savePaperToLibrary,
  removePaperFromLibrary,
  isPaperSaved,
  POPULAR_CATEGORIES,
  getCategoryDisplayName,
  formatAuthors,
  formatArxivDate,
  getArxivPdfUrl,
} from "../../api/arxiv";
import { useDocumentStore } from "../../stores/documentStore";
import { useToast } from "../common/Toast";
import type { Document } from "../../types/document";

interface ArxivImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument?: (doc: Document) => void;
}

export function ArxivImportDialog({ isOpen, onClose, onOpenDocument }: ArxivImportDialogProps) {
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<ArxivPaper | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [savedPapers, setSavedPapers] = useState(getSavedPapers());
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const { importFromArxiv, loadDocuments } = useDocumentStore();
  const { success: showSuccess, error: showError } = useToast();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSelectedCategory(null);
    setSelectedPaper(null);

    try {
      const results = await searchArxiv(searchQuery, 20);
      setPapers(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const handleCategorySelect = useCallback(async (categoryId: string) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery("");
    setSelectedCategory(categoryId);
    setSelectedPaper(null);
    setShowCategoryDropdown(false);

    try {
      const results = await getArxivCategoryPapers(categoryId, 20);
      setPapers(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset state and load default category when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPapers([]);
      setSelectedPaper(null);
      setSearchQuery("");
      setImportError(null);
      setImportSuccess(null);
      setSavedPapers(getSavedPapers());
      
      // Load default category (AI)
      if (POPULAR_CATEGORIES.length > 0) {
        handleCategorySelect(POPULAR_CATEGORIES[0].id);
      }
    }
  }, [isOpen, handleCategorySelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleToggleSave = (paper: ArxivPaper) => {
    if (isPaperSaved(paper.id)) {
      removePaperFromLibrary(paper.id);
    } else {
      savePaperToLibrary(paper);
    }
    setSavedPapers(getSavedPapers());
  };

  const handleImport = async (paper: ArxivPaper) => {
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      // Use the store's importFromArxiv method which handles everything
      const doc = await importFromArxiv(paper.id);
      
      // Reload documents to show the new import
      await loadDocuments();

      setImportSuccess(paper.id);
      showSuccess("Paper imported", `"${paper.title.substring(0, 50)}..." has been added to your library`);
      
      // Close dialog and open the document
      setTimeout(() => {
        onClose();
        // Open the document if callback provided
        if (onOpenDocument && doc) {
          onOpenDocument(doc);
        }
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setImportError(message);
      showError("Import failed", message);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Import from ArXiv</h2>
              <p className="text-sm text-muted-foreground">
                Search and download research papers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-border bg-card/50 overflow-y-auto">
            <div className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </h3>
              <div className="space-y-1">
                {POPULAR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {savedPapers.length > 0 && (
              <div className="border-t border-border p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved Papers ({savedPapers.length})
                </h3>
                <div className="space-y-1">
                  {savedPapers.slice(0, 5).map((paper) => (
                    <button
                      key={paper.id}
                      onClick={() => {
                        setSelectedPaper(paper);
                        setPapers([paper]);
                      }}
                      className="w-full truncate rounded-lg px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      {paper.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search bar */}
            <div className="border-b border-border bg-card p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search papers by title, author, or keywords..."
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isLoading || !searchQuery.trim()}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </button>
              </div>
              {selectedCategory && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Browsing:</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary font-medium">
                    {getCategoryDisplayName(selectedCategory)}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setPapers([]);
                    }}
                    className="text-xs hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="m-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {papers.length === 0 && !isLoading && !error && (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-foreground">
                    Search ArXiv Papers
                  </h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Enter keywords to search millions of research papers, or select a category from the sidebar.
                  </p>
                </div>
              )}

              <div className="divide-y divide-border">
                {papers.map((paper) => {
                  const saved = isPaperSaved(paper.id);
                  const isImportSuccess = importSuccess === paper.id;

                  return (
                    <div
                      key={paper.id}
                      onClick={() => setSelectedPaper(paper)}
                      className={cn(
                        "cursor-pointer p-4 transition-colors hover:bg-muted/50",
                        selectedPaper?.id === paper.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Paper info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="mb-1 text-sm font-semibold text-foreground line-clamp-2">
                            {paper.title}
                          </h3>
                          <p className="mb-2 text-xs text-muted-foreground">
                            <User className="inline h-3 w-3 mr-1" />
                            {formatAuthors(paper.authors)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatArxivDate(paper.published)}
                            </span>
                            <span>•</span>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                              {getCategoryDisplayName(paper.primaryCategory)}
                            </span>
                            {paper.categories.length > 1 && (
                              <span className="text-muted-foreground/60">
                                +{paper.categories.length - 1} more
                              </span>
                            )}
                          </div>
                          {paper.summary && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                              {paper.summary}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSave(paper);
                            }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title={saved ? "Remove from saved" : "Save to library"}
                          >
                            {saved ? (
                              <BookmarkCheck className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </button>
                          <a
                            href={paper.absUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Open on ArXiv"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImport(paper);
                            }}
                            disabled={isImporting}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5",
                              isImportSuccess
                                ? "bg-green-500 text-white"
                                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            )}
                          >
                            {isImporting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isImportSuccess ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            {isImportSuccess ? "Imported" : "Import"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detail panel */}
          {selectedPaper && (
            <div className="w-96 border-l border-border bg-card overflow-y-auto">
              <div className="p-5">
                <div className="mb-4">
                  <h2 className="mb-2 text-lg font-semibold text-foreground leading-tight">
                    {selectedPaper.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    <User className="inline h-4 w-4 mr-1" />
                    {formatAuthors(selectedPaper.authors)}
                  </p>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedPaper.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {getCategoryDisplayName(cat)}
                    </span>
                  ))}
                </div>

                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Published {formatArxivDate(selectedPaper.published)}</span>
                  </div>
                  {selectedPaper.comment && (
                    <div className="rounded-lg bg-muted p-3 text-xs">
                      <strong>Comment:</strong> {selectedPaper.comment}
                    </div>
                  )}
                </div>

                {selectedPaper.summary && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-sm font-semibold text-foreground">Abstract</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedPaper.summary}
                    </p>
                  </div>
                )}

                {importError && (
                  <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{importError}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleImport(selectedPaper)}
                    disabled={isImporting}
                    className={cn(
                      "w-full rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2",
                      importSuccess === selectedPaper.id
                        ? "bg-green-500 text-white"
                        : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    )}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : importSuccess === selectedPaper.id ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Imported Successfully
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        Import to Library
                      </>
                    )}
                  </button>
                  <a
                    href={getArxivPdfUrl(selectedPaper.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                  <a
                    href={selectedPaper.absUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on ArXiv
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
