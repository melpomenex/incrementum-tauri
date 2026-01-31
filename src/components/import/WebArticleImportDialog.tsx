/**
 * Web Article Import Dialog
 * 
 * Import web articles by URL, similar to the browser extension.
 * Fetches content, extracts metadata, and creates a document.
 */

import { useState, useCallback, useEffect } from "react";
import {
  Globe,
  Link2,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Tag,
  ExternalLink,
  Download,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "../../utils";
import { useDocumentStore } from "../../stores/documentStore";
import { useToast } from "../common/Toast";
import type { Document } from "../../types/document";

interface WebArticleImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument?: (doc: Document) => void;
}

interface ArticlePreview {
  url: string;
  title: string;
  author?: string;
  description?: string;
  text: string;
  html?: string;
  wordCount: number;
  readingTime: number;
  siteName?: string;
  image?: string;
  favicon?: string;
}

export function WebArticleImportDialog({ isOpen, onClose, onOpenDocument }: WebArticleImportDialogProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ArticlePreview | null>(null);
  const [tags, setTags] = useState<string[]>(["article", "web"]);
  const [newTag, setNewTag] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedDoc, setImportedDoc] = useState<Document | null>(null);

  const { importFromUrl, loadDocuments } = useDocumentStore();
  const { success: showSuccess, error: showError } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUrl("");
      setPreview(null);
      setError(null);
      setTags(["article", "web"]);
      setNewTag("");
      setImportSuccess(false);
    }
  }, [isOpen]);

  const extractSiteName = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  const calculateReadingTime = (wordCount: number): number => {
    const wordsPerMinute = 250;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const handleFetch = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Basic URL validation
    let processedUrl = url.trim();
    if (!processedUrl.startsWith("http://") && !processedUrl.startsWith("https://")) {
      processedUrl = `https://${processedUrl}`;
      setUrl(processedUrl);
    }

    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      // Use the store's importFromUrl to fetch and create
      const doc = await importFromUrl(processedUrl);
      
      // Store the imported document
      setImportedDoc(doc);
      
      // Create preview from the imported document
      const wordCount = doc.content?.split(/\s+/).length || 0;
      
      setPreview({
        url: processedUrl,
        title: doc.title || extractSiteName(processedUrl),
        author: doc.metadata?.author,
        description: doc.metadata?.subject,
        text: doc.content || "",
        html: doc.content,
        wordCount,
        readingTime: calculateReadingTime(wordCount),
        siteName: extractSiteName(processedUrl),
      });
      
      // Set default tags from the imported document
      if (doc.tags && doc.tags.length > 0) {
        setTags(doc.tags);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch article";
      setError(message);
      showError("Fetch failed", message);
    } finally {
      setIsLoading(false);
    }
  }, [url, importFromUrl, showError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFetch();
    }
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleImport = async () => {
    if (!preview || !importedDoc) return;

    setIsImporting(true);
    setError(null);

    try {
      // Update the imported document with user-selected tags
      const { updateDocument } = useDocumentStore.getState();
      await updateDocument(importedDoc.id, { tags });
      
      // Reload to get latest state
      await loadDocuments();

      setImportSuccess(true);
      showSuccess("Article imported", `"${preview.title.substring(0, 50)}..." has been added to your library`);

      // Close dialog and open the document
      setTimeout(() => {
        onClose();
        if (onOpenDocument) {
          onOpenDocument(importedDoc);
        }
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setError(message);
      showError("Import failed", message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Import Web Article</h2>
              <p className="text-sm text-muted-foreground">
                Save articles from the web to your library
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
          {/* Left panel - URL input and options */}
          <div className="flex w-96 flex-col border-r border-border bg-card/50">
            <div className="flex-1 overflow-y-auto p-5">
              {/* URL Input */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Article URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="https://example.com/article"
                      className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <button
                    onClick={handleFetch}
                    disabled={isLoading || !url.trim()}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Fetch
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Enter a URL to fetch the article content. Supports most websites.
                </p>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-primary/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Quick tags */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Quick Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {["article", "blog", "tutorial", "research", "news", "video"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!tags.includes(tag)) {
                          setTags([...tags, tag]);
                        }
                      }}
                      disabled={tags.includes(tag)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Import button */}
            {preview && (
              <div className="border-t border-border p-5">
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className={cn(
                    "w-full rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2",
                    importSuccess
                      ? "bg-green-500 text-white"
                      : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  )}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : importSuccess ? (
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
              </div>
            )}
          </div>

          {/* Right panel - Preview */}
          <div className="flex flex-1 flex-col overflow-hidden bg-background">
            {isLoading ? (
              <div className="flex h-full flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Fetching article...</p>
              </div>
            ) : !preview ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-foreground">
                  Import Web Articles
                </h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Enter a URL to fetch article content. The page will be saved to your library for reading and extracting.
                </p>
                <div className="mt-6 flex gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-1">Medium</span>
                  <span className="rounded bg-muted px-2 py-1">Substack</span>
                  <span className="rounded bg-muted px-2 py-1">Wikipedia</span>
                  <span className="rounded bg-muted px-2 py-1">+ more</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Preview header */}
                <div className="border-b border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1 text-xl font-semibold text-foreground">
                        {preview.title}
                      </h3>
                      {preview.author && (
                        <p className="mb-2 text-sm text-muted-foreground">
                          By {preview.author}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {preview.siteName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {preview.wordCount.toLocaleString()} words
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {preview.readingTime} min read
                        </span>
                      </div>
                    </div>
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Open original"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {preview.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                      {preview.description}
                    </p>
                  )}

                  {/* Tags preview */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content preview */}
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {preview.text ? (
                      <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {preview.text.substring(0, 3000)}
                        {preview.text.length > 3000 && (
                          <span className="text-muted-foreground/50">
                            {"\n\n"}... (content truncated in preview)
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No text content available for preview.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
