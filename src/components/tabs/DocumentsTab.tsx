import { useEffect, useState, useCallback } from "react";
import { Youtube, X, Link2 } from "lucide-react";
import { useTabsStore } from "../../stores";
import { useDocumentStore } from "../../stores";
import { DocumentViewer } from "./TabRegistry";
import { importYouTubeVideo } from "../../api/documents";

export function DocumentsTab() {
  const { addTab } = useTabsStore();
  const { documents, isLoading, isImporting, importProgress, error, loadDocuments, openFilePickerAndImport, importFromFiles } = useDocumentStore();
  const [isDragging, setIsDragging] = useState(false);
  const [showYouTubeImport, setShowYouTubeImport] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleImport = async () => {
    try {
      const imported = await openFilePickerAndImport();
      if (imported.length > 0) {
        // Documents are already added to state by the store
        console.log(`Imported ${imported.length} document(s)`);
      }
    } catch (error) {
      console.error("Failed to import:", error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Convert FileList to file paths (in Tauri, we'd need to use the file system API)
    // The file.path property is available when files are dragged from the file system
    const filePaths = files
      .map(file => (file as any).path)
      .filter(path => path && typeof path === 'string');

    if (filePaths.length > 0) {
      try {
        await importFromFiles(filePaths);
      } catch (error) {
        console.error("Failed to import dropped files:", error);
      }
    } else {
      console.warn("Drag and drop import: Unable to get file paths. This feature requires Tauri to be running in native mode.");
    }
  }, [importFromFiles]);

  const handleOpenDocument = (doc: any) => {
    addTab({
      title: doc.title,
      icon: doc.fileType === "pdf" ? "📕" : doc.fileType === "epub" ? "📖" : doc.fileType === "youtube" ? "📺" : "📄",
      type: "document-viewer",
      content: DocumentViewer,
      closable: true,
      data: { documentId: doc.id },
    });
  };

  const handleYouTubeImport = async () => {
    if (!youtubeUrl.trim()) {
      setYoutubeError("Please enter a YouTube URL");
      return;
    }

    setYoutubeLoading(true);
    setYoutubeError(null);

    try {
      const document = await importYouTubeVideo(youtubeUrl.trim());
      // Reload documents to show the newly imported video
      await loadDocuments();
      setShowYouTubeImport(false);
      setYoutubeUrl("");

      // Automatically open the imported document
      addTab({
        title: document.title,
        icon: "📺",
        type: "document-viewer",
        content: DocumentViewer,
        closable: true,
        data: { documentId: document.id },
      });
    } catch (err) {
      setYoutubeError(err instanceof Error ? err.message : "Failed to import YouTube video");
    } finally {
      setYoutubeLoading(false);
    }
  };

  return (
    <div
      className={`h-full overflow-auto p-6 ${isDragging ? 'bg-primary/10' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">
            Browse and manage your documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowYouTubeImport(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
            title="Import YouTube video"
          >
            <Youtube className="w-4 h-4" />
            Import YouTube
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? "Importing..." : "Import Document"}
          </button>
        </div>
      </div>

      {/* YouTube Import Dialog */}
      {showYouTubeImport && (
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
                  onChange={(e) => setYoutubeUrl(e.target.value)}
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

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          {error}
        </div>
      )}

      {isImporting && importProgress.total > 0 && (
        <div className="mb-4 p-4 bg-muted rounded-lg">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading documents...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No documents yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Import your first document to get started
          </p>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? "Importing..." : "Import Your First Document"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handleOpenDocument(doc)}
              className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground line-clamp-2">
                  {doc.title}
                </h3>
                <span className="text-xl">
                  {doc.fileType === "pdf" && "📕"}
                  {doc.fileType === "epub" && "📖"}
                  {doc.fileType === "markdown" && "📝"}
                  {doc.fileType === "html" && "🌐"}
                  {doc.fileType === "youtube" && "📺"}
                </span>
              </div>

              {doc.category && (
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                    {doc.category}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {doc.extractCount} extracts
                </span>
                <span>
                  {doc.learningItemCount} cards
                </span>
              </div>

              {doc.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {doc.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                      +{doc.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Added {new Date(doc.dateAdded).toLocaleDateString()}</span>
                {doc.isFavorite && <span>⭐</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
