/**
 * Audiobook Import Dialog
 * 
 * Import audiobooks with metadata fetching, cover art selection,
 * and transcript management options. Supports both single file and
 * batch/directory import.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  BookAudio,
  Upload,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  User,
  Headphones,
  FileText,
  Sparkles,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  List,
  Bookmark,
  Mic,
  Languages,
  Volume2,
  FolderOpen,
  Folder,
  Check,
  AlertTriangle,
  File,
  Layers,
  Link,
} from "lucide-react";
import { cn } from "../../utils";
import { useDocumentStore } from "../../stores/documentStore";
import { useToast } from "../common/Toast";
import { updateDocument as updateDocumentApi } from "../../api/documents";
import {
  AudiobookMetadata,
  AudiobookChapter,
  AudiobookTranscript,
  parseAudiobookMetadata,
  searchAudiobookCover,
  searchAudiobookMetadata,
  generateTranscript,
  importTranscriptFromFile,
  formatDuration,
  formatFileSize,
  AUDIOBOOK_FORMATS,
  scanDirectoryForAudiobooks,
  BatchImportResult,
  detectMultiPartAudiobook,
  MultiPartAudiobook,
} from "../../api/audiobooks";
import { openFilePicker, openFolderPicker } from "../../api/documents";
import { isTauri } from "../../lib/tauri";
import type { Document } from "../../types/document";

interface AudiobookImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument?: (doc: Document) => void;
}

interface BatchItem {
  id: string;
  filePath: string;
  fileName: string;
  status: "pending" | "loading" | "ready" | "error";
  metadata?: Partial<AudiobookMetadata>;
  coverOptions?: string[];
  selectedCover?: string;
  transcript?: AudiobookTranscript | null;
  error?: string;
}

type ImportMode = "single" | "batch";
type ImportStep = "select" | "metadata" | "transcript" | "confirm";

export function AudiobookImportDialog({
  isOpen,
  onClose,
  onOpenDocument,
}: AudiobookImportDialogProps) {
  const [importMode, setImportMode] = useState<ImportMode>("single");
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  
  // Single file state
  const [filePath, setFilePath] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [metadata, setMetadata] = useState<Partial<AudiobookMetadata>>({});
  const [coverOptions, setCoverOptions] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState<string>("");
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [transcript, setTranscript] = useState<AudiobookTranscript | null>(null);
  
  // Batch import state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchSearchQueries, setBatchSearchQueries] = useState<Record<string, string>>({});
  const [batchSearchResults, setBatchSearchResults] = useState<Record<string, Partial<AudiobookMetadata>[]>>({});
  
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Partial<AudiobookMetadata>[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  // Multi-part book state
  const [multiPartBook, setMultiPartBook] = useState<MultiPartAudiobook | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Audio preview state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  const { importFromFiles, loadDocuments } = useDocumentStore();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setImportMode("single");
      setCurrentStep("select");
      setFilePath("");
      setFileSize(0);
      setMetadata({});
      setCoverOptions([]);
      setSelectedCover("");
      setChapters([]);
      setTranscript(null);
      setBatchItems([]);
      setCurrentBatchIndex(0);
      setBatchSearchQueries({});
      setBatchSearchResults({});
      setMultiPartBook(null);
      setSelectedFiles([]);
      setError(null);
      setSearchQuery("");
      setSearchResults([]);
      setImportProgress({ current: 0, total: 0 });
      setIsPlaying(false);
      setPreviewTime(0);
      setPreviewDuration(0);
    }
  }, [isOpen]);

  // Handle file selection (single or multiple)
  const handleFileSelect = async () => {
    try {
      // In PWA/browser, allow selecting multiple files
      // In Tauri, we'll handle multi-part via a special flow
      const files = await openFilePicker({
        title: "Select Audiobook Files",
        multiple: true, // Allow multiple selection
        filters: [
          {
            name: "Audiobooks",
            extensions: AUDIOBOOK_FORMATS,
          },
        ],
      });
      
      if (!files || files.length === 0) return;
      
      // Check if multiple files might be parts of the same book
      if (files.length > 1) {
        const detectedMultiPart = detectMultiPartAudiobook(files);
        
        if (detectedMultiPart) {
          // This looks like a multi-part book
          setSelectedFiles(files);
          setMultiPartBook(detectedMultiPart);
          
          // Set metadata from detection
          setMetadata({
            title: detectedMultiPart.title,
            author: detectedMultiPart.author,
            duration: 0, // Will sum parts later
          });
          
          // Search for cover
          const [covers, metaResults] = await Promise.all([
            searchAudiobookCover(detectedMultiPart.title, detectedMultiPart.author),
            searchAudiobookMetadata(detectedMultiPart.title, detectedMultiPart.author),
          ]);
          
          setCoverOptions(covers);
          setSearchResults(metaResults);
          if (covers.length > 0) setSelectedCover(covers[0]);
          if (metaResults.length > 0) {
            setMetadata(prev => ({ ...prev, ...metaResults[0] }));
          }
          
          setImportMode("single"); // Treat as single book
          setCurrentStep("metadata");
          showSuccess("Multi-part book detected", `${files.length} parts found for "${detectedMultiPart.title}"`);
          return;
        }
        
        // Multiple files but not detected as parts - treat as batch
        // Convert to batch items
        const items: BatchItem[] = files.map((filePath, index) => ({
          id: `item-${index}`,
          filePath,
          fileName: filePath.split(/[/\\]/).pop() || filePath,
          status: "pending",
        }));
        
        setBatchItems(items);
        setImportMode("batch");
        await loadBatchMetadata(items);
        return;
      }
      
      // Single file
      await loadSingleFile(files[0]);
    } catch (err) {
      showError("File selection failed", "Could not open file picker");
    }
  };

  // Handle directory selection for batch import (desktop) or multi-file (browser)
  const handleDirectorySelect = async () => {
    // In browser/PWA, fall back to multi-file selection
    if (!isTauri()) {
      showInfo(
        "Directory import not available", 
        "In the web app, please use 'Single File' mode and select multiple files to import them as a batch."
      );
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("[AudiobookImport] Opening folder picker...");
      const dirPath = await openFolderPicker({
        title: "Select Directory with Audiobooks",
      });
      
      if (!dirPath) {
        console.log("[AudiobookImport] No directory selected");
        setIsLoading(false);
        return;
      }
      
      console.log("[AudiobookImport] Selected directory:", dirPath);
      setImportMode("batch");
      
      // Scan directory for audiobook files
      console.log("[AudiobookImport] Scanning for audiobooks...");
      let audiobookFiles: string[] = [];
      try {
        audiobookFiles = await scanDirectoryForAudiobooks(dirPath);
      } catch (scanErr) {
        console.error("[AudiobookImport] Scan failed - backend may not support this command:", scanErr);
        showError(
          "Directory scanner not available", 
          "The directory scan feature is not yet available in this build. Please use 'Single File' mode and select multiple files instead."
        );
        setImportMode("single");
        setCurrentStep("select");
        setIsLoading(false);
        return;
      }
      
      console.log("[AudiobookImport] Found files:", audiobookFiles.length);
      
      if (audiobookFiles.length === 0) {
        setError(`No audiobook files found in ${dirPath}. Supported formats: ${AUDIOBOOK_FORMATS.join(", ")}`);
        setIsLoading(false);
        return;
      }
      
      // Create batch items
      const items: BatchItem[] = audiobookFiles.map((filePath, index) => ({
        id: `item-${index}`,
        filePath,
        fileName: filePath.split(/[/\\]/).pop() || filePath,
        status: "pending",
      }));
      
      setBatchItems(items);
      setImportProgress({ current: 0, total: items.length });
      
      // Load metadata for all files
      await loadBatchMetadata(items);
      
    } catch (err) {
      console.error("[AudiobookImport] Directory selection error:", err);
      setError(err instanceof Error ? err.message : "Failed to open directory");
      showError("Directory import failed", err instanceof Error ? err.message : "Unknown error");
      setImportMode("single");
      setCurrentStep("select");
    } finally {
      setIsLoading(false);
    }
  };

  // Load metadata for batch items
  const loadBatchMetadata = async (items: BatchItem[]) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setImportProgress({ current: i + 1, total: items.length });
      
      try {
        // Update status to loading
        setBatchItems(prev => prev.map(b => 
          b.id === item.id ? { ...b, status: "loading" } : b
        ));
        
        // Parse metadata
        const parsed = await parseAudiobookMetadata(item.filePath);
        
        // Search for covers and metadata
        const [covers, metaResults] = await Promise.all([
          searchAudiobookCover(parsed.title, parsed.author),
          searchAudiobookMetadata(parsed.title, parsed.author),
        ]);
        
        // Update item with metadata
        const bestMatch = metaResults[0] || {};
        setBatchItems(prev => prev.map(b => 
          b.id === item.id ? {
            ...b,
            status: "ready",
            metadata: {
              ...parsed,
              ...bestMatch,
              duration: parsed.duration || bestMatch.duration || 0,
            },
            coverOptions: covers,
            selectedCover: covers[0] || "",
            transcript: null,
          } : b
        ));
        
        // Store search results
        if (metaResults.length > 0) {
          setBatchSearchResults(prev => ({ ...prev, [item.id]: metaResults }));
        }
        
      } catch (err) {
        setBatchItems(prev => prev.map(b => 
          b.id === item.id ? {
            ...b,
            status: "error",
            error: "Failed to load metadata",
          } : b
        ));
      }
    }
    
    // Move to metadata step
    setCurrentStep("metadata");
  };

  // Load single file
  const loadSingleFile = async (path: string) => {
    setFilePath(path);
    setIsLoading(true);
    setImportMode("single");
    
    try {
      const parsed = await parseAudiobookMetadata(path);
      setMetadata(parsed);
      setChapters(parsed.chapters || []);
      
      // Search for covers and metadata
      const [covers, metaResults] = await Promise.all([
        searchAudiobookCover(parsed.title, parsed.author),
        searchAudiobookMetadata(parsed.title, parsed.author),
      ]);
      
      setCoverOptions(covers);
      setSearchResults(metaResults);
      if (covers.length > 0) {
        setSelectedCover(covers[0]);
      }
      
      // Update metadata with search results if available
      if (metaResults.length > 0) {
        const bestMatch = metaResults[0];
        setMetadata(prev => ({
          ...prev,
          ...bestMatch,
          duration: prev.duration || bestMatch.duration || 0,
        }));
      }
      
      setCurrentStep("metadata");
    } catch (err) {
      setError("Failed to parse audiobook metadata");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle metadata search for single file
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const [covers, metaResults] = await Promise.all([
        searchAudiobookCover(searchQuery, metadata.author),
        searchAudiobookMetadata(searchQuery, metadata.author),
      ]);
      
      setCoverOptions(covers);
      setSearchResults(metaResults);
      if (covers.length > 0 && !selectedCover) {
        setSelectedCover(covers[0]);
      }
    } catch (err) {
      showError("Search failed", "Could not fetch metadata");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate transcript for single file
  const handleGenerateTranscript = async () => {
    if (!isTauri()) {
      showError("Not available", "Transcript generation requires the desktop app");
      return;
    }
    
    setIsGeneratingTranscript(true);
    try {
      const result = await generateTranscript(filePath, (progress) => {
        // Could show progress here
      });
      setTranscript(result);
      showSuccess("Transcript generated", "Your audiobook is now ready for incremental reading");
    } catch (err) {
      showError("Generation failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  // Import transcript from file
  const handleImportTranscript = async () => {
    try {
      const files = await openFilePicker({
        title: "Select Transcript",
        multiple: false,
        filters: [
          { name: "Text files", extensions: ["txt", "json", "srt", "vtt"] },
        ],
      });
      
      if (files && files.length > 0) {
        const result = await importTranscriptFromFile(files[0]);
        setTranscript(result);
        showSuccess("Transcript imported", "Your transcript has been loaded");
      }
    } catch (err) {
      showError("Import failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  // Import single audiobook (handles both single file and multi-part)
  const handleImport = async () => {
    if (!filePath && !multiPartBook) return;
    
    setIsLoading(true);
    try {
      let doc: Document;
      
      if (multiPartBook && selectedFiles.length > 0) {
        // Import multi-part book
        // Import first file as the main document
        const imported = await importFromFiles([selectedFiles[0]]);
        if (imported.length === 0) throw new Error("Failed to import audiobook");
        doc = imported[0];
        
        // Store additional file paths for the player
        const additionalParts = selectedFiles.slice(1);
        
        // Create chapters from parts
        const partChapters: AudiobookChapter[] = multiPartBook.parts.map((part, idx) => ({
          id: idx + 1,
          title: `Part ${part.partNumber}`,
          startTime: 0, // Player will calculate cumulative times
          duration: part.duration,
        }));
        
        // Update with metadata - explicitly set fileType to 'audio' via API
        await updateDocumentApi(doc.id, {
          ...doc,
          title: metadata.title || doc.title,
          fileType: "audio",
          tags: ["audiobook", "audio", "multi-part", ...(metadata.genre || [])],
          coverImageUrl: selectedCover,
          metadata: {
            author: metadata.author,
            subject: metadata.description?.substring(0, 200),
            keywords: metadata.genre,
            language: metadata.language,
          },
        } as Document);
        
        // Save audiobook data with all parts
        const audiobookData = {
          documentId: doc.id,
          chapters: partChapters,
          transcript,
          metadata,
          multiPart: {
            totalParts: selectedFiles.length,
            partFiles: selectedFiles,
          },
        };
        localStorage.setItem(`audiobook-${doc.id}`, JSON.stringify(audiobookData));
        
      } else {
        // Single file import
        const imported = await importFromFiles([filePath]);
        if (imported.length === 0) throw new Error("Failed to import audiobook");
        doc = imported[0];
        
        // Update with metadata - explicitly set fileType to 'audio' via API
        await updateDocumentApi(doc.id, {
          ...doc,
          title: metadata.title || doc.title,
          fileType: "audio",
          tags: ["audiobook", "audio", ...(metadata.genre || [])],
          coverImageUrl: selectedCover,
          metadata: {
            author: metadata.author,
            subject: metadata.description?.substring(0, 200),
            keywords: metadata.genre,
            language: metadata.language,
          },
        } as Document);
        
        // If we have a transcript, save it
        if (transcript?.fullText) {
          const { updateDocumentContent } = await import("../../api/documents");
          await updateDocumentContent(doc.id, transcript.fullText);
        }
        
        // Save audiobook data
        const audiobookData = {
          documentId: doc.id,
          chapters,
          transcript,
          metadata,
        };
        localStorage.setItem(`audiobook-${doc.id}`, JSON.stringify(audiobookData));
      }
      
      await loadDocuments();
      showSuccess("Audiobook imported", `"${metadata.title}" has been added to your library`);
      
      setTimeout(() => {
        onClose();
        if (onOpenDocument) {
          onOpenDocument(doc);
        }
      }, 800);
    } catch (err) {
      showError("Import failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  // Import batch of audiobooks
  const handleBatchImport = async () => {
    const readyItems = batchItems.filter(item => item.status === "ready");
    
    if (readyItems.length === 0) {
      showError("No ready items", "Please wait for metadata to load");
      return;
    }
    
    setIsLoading(true);
    setImportProgress({ current: 0, total: readyItems.length });
    
    const results: BatchImportResult = {
      successful: [],
      failed: [],
      total: readyItems.length,
    };
    
    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      setImportProgress({ current: i + 1, total: readyItems.length });
      
      try {
        const imported = await importFromFiles([item.filePath]);
        
        if (imported.length === 0) {
          throw new Error("Import failed");
        }
        
        const doc = imported[0];
        
        await updateDocumentApi(doc.id, {
          ...doc,
          title: item.metadata?.title || doc.title,
          fileType: "audio",
          tags: ["audiobook", "audio", ...(item.metadata?.genre || [])],
          coverImageUrl: item.selectedCover,
          metadata: {
            author: item.metadata?.author,
            subject: item.metadata?.description?.substring(0, 200),
            keywords: item.metadata?.genre,
            language: item.metadata?.language,
          },
        } as Document);
        
        // Save audiobook data
        const audiobookData = {
          documentId: doc.id,
          chapters: [],
          transcript: item.transcript,
          metadata: item.metadata,
        };
        localStorage.setItem(`audiobook-${doc.id}`, JSON.stringify(audiobookData));
        
        results.successful.push({
          filePath: item.filePath,
          document: doc,
          metadata: item.metadata || {},
        });
        
      } catch (err) {
        results.failed.push({
          filePath: item.filePath,
          error: err instanceof Error ? err.message : "Import failed",
        });
      }
    }
    
    await loadDocuments();
    
    // Show summary
    if (results.failed.length === 0) {
      showSuccess(
        "Import complete",
        `${results.successful.length} audiobooks imported successfully`
      );
    } else {
      showError(
        "Import partially failed",
        `${results.successful.length} imported, ${results.failed.length} failed`
      );
    }
    
    setTimeout(() => {
      onClose();
      // Open first successful document
      if (onOpenDocument && results.successful.length > 0) {
        onOpenDocument(results.successful[0].document);
      }
    }, 1500);
    
    setIsLoading(false);
  };

  // Audio preview handlers
  const togglePreview = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPreviewTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setPreviewDuration(audioRef.current.duration);
    }
  };

  const skipPreview = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(previewDuration, audioRef.current.currentTime + seconds)
      );
    }
  };

  // Update batch item metadata
  const updateBatchItem = (itemId: string, updates: Partial<BatchItem>) => {
    setBatchItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <BookAudio className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {importMode === "batch" ? "Import Audiobooks" : "Import Audiobook"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {importMode === "batch" 
                  ? `${batchItems.filter(i => i.status === "ready").length} of ${batchItems.length} ready`
                  : "Add audiobooks with transcripts for incremental learning"
                }
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

        {/* Progress Steps - only show for single mode */}
        {importMode === "single" && (
          <div className="flex items-center gap-2 border-b border-border bg-card/50 px-6 py-3">
            {[
              { id: "select", label: "Select File", icon: Upload },
              { id: "metadata", label: "Metadata", icon: ImageIcon },
              { id: "transcript", label: "Transcript", icon: FileText },
              { id: "confirm", label: "Confirm", icon: CheckCircle2 },
            ].map((step, index) => {
              const isActive = currentStep === step.id;
              const isPast = [
                "select",
                "metadata",
                "transcript",
                "confirm",
              ].indexOf(currentStep) > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isPast && "text-primary",
                      !isActive && !isPast && "text-muted-foreground"
                    )}
                  >
                    <step.icon className="h-4 w-4" />
                    {step.label}
                  </div>
                  {index < 3 && (
                    <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: File Selection */}
          {currentStep === "select" && (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 rounded-full bg-amber-500/10 p-6">
                <BookAudio className="h-12 w-12 text-amber-500" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                Import Audiobooks
              </h3>
              <p className="mb-8 max-w-md text-sm text-muted-foreground">
                Import a single audiobook or select a directory to batch import multiple files.
                We'll automatically fetch metadata and cover art.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                {/* Single file import */}
                <button
                  onClick={handleFileSelect}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-card p-6 hover:border-primary/50 hover:bg-muted/30 transition-all disabled:opacity-50"
                >
                  <div className="rounded-full bg-primary/10 p-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Single File</p>
                    <p className="text-xs text-muted-foreground">Import one audiobook</p>
                  </div>
                </button>
                
                {/* Directory import */}
                <button
                  onClick={handleDirectorySelect}
                  disabled={isLoading || !isTauri()}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all",
                    isTauri() 
                      ? "border-border bg-card hover:border-primary/50 hover:bg-muted/30 disabled:opacity-50"
                      : "border-dashed border-border/50 bg-muted/20 opacity-60 cursor-not-allowed"
                  )}
                  title={isTauri() ? "Import all audiobooks in a folder" : "Directory import requires desktop app - use Single File mode to select multiple files"}
                >
                  <div className="rounded-full bg-amber-500/10 p-3">
                    <FolderOpen className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">Directory</p>
                    <p className="text-xs text-muted-foreground">
                      {isTauri() ? "Import all audiobooks in folder" : "Desktop app only"}
                    </p>
                  </div>
                  {!isTauri() && (
                    <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Use Single File mode
                    </span>
                  )}
                </button>
              </div>
              
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {AUDIOBOOK_FORMATS.map(format => (
                  <span key={format} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground uppercase">
                    .{format}
                  </span>
                ))}
              </div>
              
              {error && (
                <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Batch Mode - Loading */}
          {importMode === "batch" && currentStep === "select" && isLoading && (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="mb-2 text-xl font-semibold">Scanning Directory...</h3>
              <p className="text-muted-foreground">
                Found {batchItems.length} audiobook files
              </p>
            </div>
          )}

          {/* Batch Mode - Metadata Review */}
          {importMode === "batch" && currentStep === "metadata" && (
            <div className="flex h-full flex-col">
              {/* Progress */}
              <div className="border-b border-border bg-card/50 px-6 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Processing {importProgress.current} of {importProgress.total} files
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round((importProgress.current / importProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Batch items grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {batchItems.map((item) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "rounded-xl border-2 p-4 transition-all",
                        item.status === "ready" 
                          ? "border-green-500/30 bg-green-500/5" 
                          : item.status === "error"
                          ? "border-destructive/30 bg-destructive/5"
                          : item.status === "loading"
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      {/* Status indicator */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          item.status === "ready" && "bg-green-500/10 text-green-600",
                          item.status === "error" && "bg-destructive/10 text-destructive",
                          item.status === "loading" && "bg-primary/10 text-primary",
                          item.status === "pending" && "bg-muted text-muted-foreground"
                        )}>
                          {item.status === "ready" && "Ready"}
                          {item.status === "error" && "Error"}
                          {item.status === "loading" && "Loading..."}
                          {item.status === "pending" && "Pending"}
                        </span>
                        {item.status === "ready" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {item.status === "error" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                      
                      {/* Cover */}
                      <div className="aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                        {item.selectedCover ? (
                          <img 
                            src={item.selectedCover} 
                            alt="" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <BookAudio className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <h4 className="font-medium text-sm truncate mb-1">
                        {item.metadata?.title || item.fileName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {item.metadata?.author || "Unknown author"}
                      </p>
                      
                      {item.metadata?.duration && (
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDuration(item.metadata.duration)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="border-t border-border bg-card p-4 flex justify-between">
                <button
                  onClick={() => {
                    setImportMode("single");
                    setCurrentStep("select");
                    setBatchItems([]);
                  }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep("transcript")}
                  disabled={batchItems.filter(i => i.status === "ready").length === 0}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Metadata - Single Mode */}
          {importMode === "single" && currentStep === "metadata" && (
            <div className="flex h-full">
              {/* Left: Cover Art */}
              <div className="w-80 border-r border-border bg-card/50 p-6 overflow-y-auto">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Cover Art</h3>
                
                <div className="mb-4 aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                  {selectedCover ? (
                    <img
                      src={selectedCover}
                      alt="Cover"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookAudio className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                
                {coverOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Alternative covers:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {coverOptions.slice(0, 5).map((cover, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCover(cover)}
                          className={cn(
                            "h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all",
                            selectedCover === cover
                              ? "border-primary"
                              : "border-transparent hover:border-muted"
                          )}
                        >
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Search covers:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by title..."
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isLoading}
                      className="rounded-lg bg-muted p-1.5 hover:bg-muted/80"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Multi-part info */}
                {multiPartBook && (
                  <div className="mt-6 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600">Multi-Part Book</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {selectedFiles.length} parts detected
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {multiPartBook.parts.map((part) => (
                        <div key={part.partNumber} className="text-xs flex items-center gap-1">
                          <span className="text-muted-foreground">Part {part.partNumber}:</span>
                          <span className="truncate flex-1">{part.filePath.split(/[/\\]/).pop()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right: Metadata Form */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Book Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Title
                    </label>
                    <input
                      type="text"
                      value={metadata.title || ""}
                      onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Author
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={metadata.author || ""}
                          onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                          className="flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Narrator
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <Mic className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={metadata.narrator || ""}
                          onChange={(e) => setMetadata(prev => ({ ...prev, narrator: e.target.value }))}
                          className="flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Duration
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDuration(metadata.duration || 0)}
                      </div>
                    </div>
                    
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Language
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <Languages className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={metadata.language || "en"}
                          onChange={(e) => setMetadata(prev => ({ ...prev, language: e.target.value }))}
                          className="flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Description
                    </label>
                    <textarea
                      value={metadata.description || ""}
                      onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Search Results - Click to apply:
                      </p>
                      <div className="space-y-2">
                        {searchResults.slice(0, 3).map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setMetadata(prev => ({ ...prev, ...result }));
                              if (result.coverUrl) setSelectedCover(result.coverUrl);
                            }}
                            className="w-full rounded-lg bg-background p-2 text-left text-sm hover:bg-muted transition-colors"
                          >
                            <p className="font-medium">{result.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.author} • {result.publisher}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setCurrentStep("transcript")}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Next: Transcript
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Transcript */}
          {currentStep === "transcript" && (
            <div className="flex h-full flex-col p-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Transcript Options</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                A transcript enables incremental reading, text search, and creating flashcards 
                from specific sections of the audiobook.
              </p>
              
              {importMode === "single" ? (
                // Single mode transcript options
                transcript ? (
                  <div className="flex-1 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Transcript Ready</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {transcript.segments.length.toLocaleString()} segments • {" "}
                        {transcript.fullText.split(/\s+/).length.toLocaleString()} words
                      </span>
                    </div>
                    
                    <div className="h-64 overflow-y-auto rounded-lg bg-background p-4 text-sm text-muted-foreground">
                      {transcript.fullText.substring(0, 1000)}...
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setTranscript(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                      >
                        Remove & Start Over
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={handleGenerateTranscript}
                      disabled={isGeneratingTranscript || !isTauri()}
                      className="flex flex-col items-center rounded-xl border-2 border-border bg-card p-6 text-center transition-all hover:border-primary/50 hover:bg-muted/30 disabled:opacity-50"
                    >
                      <div className="mb-3 rounded-full bg-primary/10 p-3">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="mb-1 font-medium">Generate with AI</h4>
                      <p className="text-xs text-muted-foreground">
                        Use Whisper AI to transcribe the audiobook
                      </p>
                      {!isTauri() && (
                        <span className="mt-2 text-xs text-amber-500">
                          Desktop only
                        </span>
                      )}
                      {isGeneratingTranscript && (
                        <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />
                      )}
                    </button>
                    
                    <button
                      onClick={handleImportTranscript}
                      className="flex flex-col items-center rounded-xl border-2 border-border bg-card p-6 text-center transition-all hover:border-primary/50 hover:bg-muted/30"
                    >
                      <div className="mb-3 rounded-full bg-blue-500/10 p-3">
                        <Upload className="h-6 w-6 text-blue-500" />
                      </div>
                      <h4 className="mb-1 font-medium">Import Transcript</h4>
                      <p className="text-xs text-muted-foreground">
                        Import TXT, JSON, SRT, or VTT file
                      </p>
                    </button>
                    
                    <button
                      onClick={() => setCurrentStep("confirm")}
                      className="flex flex-col items-center rounded-xl border-2 border-border bg-card p-6 text-center transition-all hover:border-primary/50 hover:bg-muted/30"
                    >
                      <div className="mb-3 rounded-full bg-muted p-3">
                        <SkipForward className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h4 className="mb-1 font-medium">Skip for Now</h4>
                      <p className="text-xs text-muted-foreground">
                        Add a transcript later from the document menu
                      </p>
                    </button>
                  </div>
                )
              ) : (
                // Batch mode - simplified transcript info
                <div className="flex-1 rounded-lg border border-border bg-muted/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <p className="font-medium">Batch Import Note</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    For batch imports, transcripts can be added later for individual audiobooks 
                    from their document menus. This keeps the import process fast while still 
                    allowing you to transcribe books as needed.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {batchItems.filter(i => i.status === "ready").length} audiobooks ready to import.
                  </p>
                </div>
              )}
              
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCurrentStep("metadata")}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep("confirm")}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Next: Confirm
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === "confirm" && (
            <div className="flex h-full p-6">
              <div className="flex-1 space-y-6">
                <h3 className="text-sm font-semibold text-foreground">
                  Review & Import
                  {importMode === "batch" && ` (${batchItems.filter(i => i.status === "ready").length} files)`}
                </h3>
                
                {importMode === "single" ? (
                  // Single file or multi-part summary
                  <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
                    {selectedCover ? (
                      <img
                        src={selectedCover}
                        alt=""
                        className="h-32 w-32 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-muted">
                        <BookAudio className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold">{metadata.title}</h4>
                      <p className="text-sm text-muted-foreground">by {metadata.author}</p>
                      
                      <div className="mt-2 flex flex-wrap gap-2">
                        {multiPartBook && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">
                            <Layers className="h-3 w-3" />
                            {selectedFiles.length} parts
                          </span>
                        )}
                        {metadata.narrator && (
                          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            <Headphones className="h-3 w-3" />
                            Narrated by {metadata.narrator}
                          </span>
                        )}
                        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(metadata.duration || 0)}
                        </span>
                        {transcript && (
                          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                            <FileText className="h-3 w-3" />
                            Transcript included
                          </span>
                        )}
                      </div>
                      
                      {multiPartBook && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p className="font-medium mb-1">Parts:</p>
                          <div className="flex flex-wrap gap-1">
                            {multiPartBook.parts.map((part) => (
                              <span key={part.partNumber} className="bg-muted px-1.5 py-0.5 rounded">
                                Part {part.partNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {metadata.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Batch summary
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                      {batchItems.filter(i => i.status === "ready").map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center gap-3 p-3 border-b border-border/50 last:border-0"
                        >
                          {item.selectedCover ? (
                            <img 
                              src={item.selectedCover} 
                              alt="" 
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                              <BookAudio className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.metadata?.title || item.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.metadata?.author || "Unknown author"} • {" "}
                              {formatDuration(item.metadata?.duration || 0)}
                            </p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Features list */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h5 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What you'll be able to do
                  </h5>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-primary" />
                      Listen with full audiobook controls (speed, bookmarks, sleep timer)
                    </li>
                    {importMode === "single" && transcript ? (
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Read along with synchronized transcript
                      </li>
                    ) : null}
                    <li className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-primary" />
                      Create extracts and flashcards from any section
                    </li>
                    <li className="flex items-center gap-2">
                      <List className="h-4 w-4 text-primary" />
                      Navigate by chapters
                    </li>
                  </ul>
                </div>
                
                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep("transcript")}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={importMode === "batch" ? handleBatchImport : handleImport}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {importMode === "batch" 
                          ? `Importing ${importProgress.current} of ${importProgress.total}...`
                          : "Importing..."
                        }
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Import {importMode === "batch" ? `${batchItems.filter(i => i.status === "ready").length} Audiobooks` : "Audiobook"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden audio element for preview */}
        {filePath && importMode === "single" && (
          <audio
            ref={audioRef}
            src={isTauri() ? undefined : filePath}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>
    </div>
  );
}
