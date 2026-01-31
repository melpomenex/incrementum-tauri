/**
 * Audiobook Import Dialog
 * 
 * Import audiobooks with metadata fetching, cover art selection,
 * and transcript management options.
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
} from "lucide-react";
import { cn } from "../../utils";
import { useDocumentStore } from "../../stores/documentStore";
import { useToast } from "../common/Toast";
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
} from "../../api/audiobooks";
import { openFilePicker } from "../../api/documents";
import { isTauri } from "../../lib/tauri";
import type { Document } from "../../types/document";

interface AudiobookImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument?: (doc: Document) => void;
}

type ImportStep = "select" | "metadata" | "transcript" | "confirm";

export function AudiobookImportDialog({
  isOpen,
  onClose,
  onOpenDocument,
}: AudiobookImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [filePath, setFilePath] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [metadata, setMetadata] = useState<Partial<AudiobookMetadata>>({});
  const [coverOptions, setCoverOptions] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState<string>("");
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [transcript, setTranscript] = useState<AudiobookTranscript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Partial<AudiobookMetadata>[]>([]);
  
  // Audio preview state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  const { importFromFiles, loadDocuments } = useDocumentStore();
  const { success: showSuccess, error: showError } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("select");
      setFilePath("");
      setFileSize(0);
      setMetadata({});
      setCoverOptions([]);
      setSelectedCover("");
      setChapters([]);
      setTranscript(null);
      setError(null);
      setSearchQuery("");
      setSearchResults([]);
      setIsPlaying(false);
      setPreviewTime(0);
      setPreviewDuration(0);
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = async () => {
    try {
      const files = await openFilePicker({
        title: "Select Audiobook",
        multiple: false,
        filters: [
          {
            name: "Audiobooks",
            extensions: AUDIOBOOK_FORMATS,
          },
        ],
      });
      
      if (files && files.length > 0) {
        const path = files[0];
        setFilePath(path);
        
        // Parse metadata
        setIsLoading(true);
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
              // Keep parsed values if search doesn't have them
              duration: prev.duration || bestMatch.duration || 0,
              chapters: prev.chapters || bestMatch.chapters || [],
            }));
          }
          
          setCurrentStep("metadata");
        } catch (err) {
          setError("Failed to parse audiobook metadata");
        } finally {
          setIsLoading(false);
        }
      }
    } catch (err) {
      showError("File selection failed", "Could not open file picker");
    }
  };

  // Handle metadata search
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

  // Generate transcript
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

  // Final import
  const handleImport = async () => {
    if (!filePath) return;
    
    setIsLoading(true);
    try {
      // Import the audiobook file
      const imported = await importFromFiles([filePath]);
      
      if (imported.length === 0) {
        throw new Error("Failed to import audiobook");
      }
      
      const doc = imported[0];
      
      // Update with metadata
      const { updateDocument } = useDocumentStore.getState();
      await updateDocument(doc.id, {
        title: metadata.title || doc.title,
        tags: ["audiobook", "audio", ...(metadata.genre || [])],
        coverImageUrl: selectedCover,
        metadata: {
          author: metadata.author,
          subject: metadata.description?.substring(0, 200),
          keywords: metadata.genre,
          language: metadata.language,
        },
      });
      
      // If we have a transcript, save it as document content
      if (transcript?.fullText) {
        const { updateDocumentContent } = await import("../../api/documents");
        await updateDocumentContent(doc.id, transcript.fullText);
      }
      
      // Save additional audiobook data to localStorage for the player
      const audiobookData = {
        documentId: doc.id,
        chapters,
        transcript,
        metadata,
      };
      localStorage.setItem(`audiobook-${doc.id}`, JSON.stringify(audiobookData));
      
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
      setFileSize(audioRef.current.duration); // Use duration as proxy for now
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <BookAudio className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Import Audiobook</h2>
              <p className="text-sm text-muted-foreground">
                Add audiobooks with transcripts for incremental learning
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

        {/* Progress Steps */}
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

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: File Selection */}
          {currentStep === "select" && (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 rounded-full bg-amber-500/10 p-6">
                <BookAudio className="h-12 w-12 text-amber-500" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                Import an Audiobook
              </h3>
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                Select an audiobook file to import. We'll automatically fetch metadata, 
                cover art, and help you create or find transcripts for incremental reading.
              </p>
              
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                {AUDIOBOOK_FORMATS.map(format => (
                  <span key={format} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground uppercase">
                    .{format}
                  </span>
                ))}
              </div>
              
              <button
                onClick={handleFileSelect}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Select Audiobook File
              </button>
              
              {error && (
                <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Metadata */}
          {currentStep === "metadata" && (
            <div className="flex h-full">
              {/* Left: Cover Art */}
              <div className="w-80 border-r border-border bg-card/50 p-6">
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
                
                {/* Search for different cover */}
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
                  
                  {/* Search results */}
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
                
                {/* Navigation */}
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
              
              {transcript ? (
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
                  {/* Option 1: Generate */}
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
                  
                  {/* Option 2: Import */}
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
                  
                  {/* Option 3: Skip for now */}
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
              )}
              
              {/* Navigation */}
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
                <h3 className="text-sm font-semibold text-foreground">Review & Import</h3>
                
                {/* Summary card */}
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
                    
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {metadata.description}
                    </p>
                  </div>
                </div>
                
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
                    {transcript ? (
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
                    onClick={handleImport}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Import Audiobook
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden audio element for preview */}
        {filePath && (
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
