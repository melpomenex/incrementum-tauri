/**
 * Audiobook Viewer
 * 
 * Full-featured audiobook player with:
 - Playback controls (play, pause, skip, speed)
 - Chapter navigation
 - Bookmark management
 - Sleep timer
 - Transcript sync and text selection
 - Extract creation from audio + text
 - Progress tracking
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Speed,
  Bookmark,
  BookmarkPlus,
  List,
  Clock,
  Moon,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Scissors,
  Quote,
  Headphones,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "../../utils";
import { Document } from "../../types/document";
import {
  AudiobookMetadata,
  AudiobookChapter,
  AudiobookTranscript,
  TranscriptSegment,
  formatDuration,
} from "../../api/audiobooks";
import { useToast } from "../common/Toast";
import { CreateExtractDialog } from "../extracts/CreateExtractDialog";

interface AudiobookViewerProps {
  document: Document;
  fileContent?: string; // Base64 or URL
}

interface AudiobookBookmark {
  id: string;
  time: number;
  title: string;
  note?: string;
  createdAt: string;
}

interface SleepTimer {
  minutes: number;
  endTime: number;
}

export function AudiobookViewer({ document, fileContent }: AudiobookViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const { success: showSuccess, info: showInfo } = useToast();
  
  // Core playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState(0);
  
  // Audiobook data
  const [metadata, setMetadata] = useState<Partial<AudiobookMetadata>>({});
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [transcript, setTranscript] = useState<AudiobookTranscript | null>(null);
  const [bookmarks, setBookmarks] = useState<AudiobookBookmark[]>([]);
  
  // UI state
  const [showChapters, setShowChapters] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<SleepTimer | null>(null);
  
  // Load audiobook data
  useEffect(() => {
    const loadAudiobookData = () => {
      const data = localStorage.getItem(`audiobook-${document.id}`);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setMetadata(parsed.metadata || {});
          setChapters(parsed.chapters || []);
          setTranscript(parsed.transcript || null);
        } catch {
          // Invalid data
        }
      }
      
      // Load bookmarks
      const bookmarksData = localStorage.getItem(`audiobook-${document.id}-bookmarks`);
      if (bookmarksData) {
        try {
          setBookmarks(JSON.parse(bookmarksData));
        } catch {
          // Invalid data
        }
      }
    };
    
    loadAudiobookData();
  }, [document.id]);
  
  // Load saved progress
  useEffect(() => {
    const savedTime = document.currentPage;
    if (savedTime && audioRef.current) {
      audioRef.current.currentTime = savedTime;
      setCurrentTime(savedTime);
    }
    
    const savedVolume = localStorage.getItem("audiobook-volume");
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
      if (audioRef.current) {
        audioRef.current.volume = parseFloat(savedVolume);
      }
    }
    
    const savedRate = localStorage.getItem("audiobook-rate");
    if (savedRate) {
      setPlaybackRate(parseFloat(savedRate));
      if (audioRef.current) {
        audioRef.current.playbackRate = parseFloat(savedRate);
      }
    }
  }, [document.id, document.currentPage]);
  
  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      // Update active transcript segment
      if (transcript?.segments) {
        const segment = transcript.segments.find(
          s => time >= s.startTime && time < s.endTime
        );
        if (segment && segment.id !== activeSegmentId) {
          setActiveSegmentId(segment.id);
          // Scroll segment into view
          const element = document.getElementById(`segment-${segment.id}`);
          if (element && showTranscript) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
      
      // Update buffered progress
      if (audioRef.current.buffered.length > 0) {
        setBuffered(audioRef.current.buffered.end(audioRef.current.buffered.length - 1));
      }
    }
  }, [transcript, activeSegmentId, showTranscript]);
  
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    showInfo("Audiobook finished", "You've reached the end");
  };
  
  // Playback controls
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, time));
    }
  };
  
  const skip = (seconds: number) => {
    seek(currentTime + seconds);
  };
  
  const goToChapter = (chapter: AudiobookChapter) => {
    seek(chapter.startTime);
    setShowChapters(false);
  };
  
  // Volume controls
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
    }
    localStorage.setItem("audiobook-volume", newVolume.toString());
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        audioRef.current.volume = 0.5;
      }
    }
  };
  
  // Playback rate
  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextRate = playbackRates[(currentIndex + 1) % playbackRates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    localStorage.setItem("audiobook-rate", nextRate.toString());
  };
  
  // Bookmarks
  const addBookmark = () => {
    const chapter = getCurrentChapter();
    const newBookmark: AudiobookBookmark = {
      id: `bookmark-${Date.now()}`,
      time: currentTime,
      title: chapter?.title || `Bookmark at ${formatDuration(currentTime)}`,
      createdAt: new Date().toISOString(),
    };
    
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    localStorage.setItem(`audiobook-${document.id}-bookmarks`, JSON.stringify(updated));
    showSuccess("Bookmark added", `Saved at ${formatDuration(currentTime)}`);
  };
  
  const deleteBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem(`audiobook-${document.id}-bookmarks`, JSON.stringify(updated));
  };
  
  const goToBookmark = (bookmark: AudiobookBookmark) => {
    seek(bookmark.time);
    setShowBookmarks(false);
  };
  
  // Sleep timer
  const startSleepTimer = (minutes: number) => {
    const endTime = Date.now() + minutes * 60 * 1000;
    setSleepTimer({ minutes, endTime });
    setShowSleepTimer(false);
    showSuccess("Sleep timer set", `Playback will pause in ${minutes} minutes`);
  };
  
  const cancelSleepTimer = () => {
    setSleepTimer(null);
  };
  
  // Check sleep timer
  useEffect(() => {
    if (!sleepTimer) return;
    
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimer.endTime) {
        if (audioRef.current && isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
        setSleepTimer(null);
        showInfo("Sleep timer", "Playback paused");
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sleepTimer, isPlaying, showInfo]);
  
  // Get current chapter
  const getCurrentChapter = (): AudiobookChapter | null => {
    if (!chapters.length) return null;
    
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].startTime) {
        return chapters[i];
      }
    }
    return chapters[0];
  };
  
  // Text selection for extracts
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };
  
  const createExtractFromSelection = () => {
    if (selectedText) {
      setIsExtractDialogOpen(true);
    }
  };
  
  // Current chapter
  const currentChapter = getCurrentChapter();
  const currentChapterIndex = currentChapter 
    ? chapters.findIndex(c => c.id === currentChapter.id)
    : -1;
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(e.shiftKey ? -30 : -10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(e.shiftKey ? 30 : 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "s":
          e.preventDefault();
          cyclePlaybackRate();
          break;
        case "b":
          e.preventDefault();
          addBookmark();
          break;
        case "t":
          e.preventDefault();
          setShowTranscript(prev => !prev);
          break;
        case "c":
          e.preventDefault();
          setShowChapters(prev => !prev);
          break;
        case "f":
          e.preventDefault();
          setIsFullscreen(prev => !prev);
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, volume, playbackRate]);
  
  // Progress bar click handler
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };
  
  return (
    <div className={cn(
      "flex flex-col bg-background h-full",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={fileContent}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Chapters/Bookmarks */}
        {(showChapters || showBookmarks) && (
          <div className="w-80 border-r border-border bg-card flex flex-col">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="font-semibold">
                {showChapters ? "Chapters" : "Bookmarks"}
              </h3>
              <button
                onClick={() => {
                  setShowChapters(false);
                  setShowBookmarks(false);
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {showChapters && chapters.map((chapter, idx) => (
                <button
                  key={chapter.id}
                  onClick={() => goToChapter(chapter)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50",
                    currentChapter?.id === chapter.id && "bg-primary/10 text-primary"
                  )}
                >
                  <p className="text-sm font-medium">{chapter.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(chapter.startTime)}
                  </p>
                </button>
              ))}
              
              {showBookmarks && (
                <>
                  {bookmarks.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No bookmarks yet
                    </div>
                  ) : (
                    bookmarks.map(bookmark => (
                      <div
                        key={bookmark.id}
                        className="flex items-start gap-2 px-4 py-3 border-b border-border/50 hover:bg-muted group"
                      >
                        <button
                          onClick={() => goToBookmark(bookmark)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-medium">{bookmark.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(bookmark.time)}
                          </p>
                          {bookmark.note && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {bookmark.note}
                            </p>
                          )}
                        </button>
                        <button
                          onClick={() => deleteBookmark(bookmark.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Center - Main player */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Cover and info */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center max-w-md w-full">
              {/* Cover */}
              <div className="relative mb-6 aspect-square w-full max-w-[300px] rounded-xl overflow-hidden shadow-2xl">
                {document.coverImageUrl ? (
                  <img
                    src={document.coverImageUrl}
                    alt={document.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <Headphones className="h-24 w-24 text-muted-foreground" />
                  </div>
                )}
                
                {/* Playing indicator */}
                {isPlaying && (
                  <div className="absolute bottom-4 right-4 flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="w-1 h-4 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Info */}
              <h1 className="text-xl font-bold text-center mb-1">{document.title}</h1>
              <p className="text-muted-foreground text-center mb-2">
                {metadata.author || document.metadata?.author}
              </p>
              {currentChapter && (
                <p className="text-sm text-primary text-center">
                  {currentChapter.title}
                </p>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div className="border-t border-border bg-card p-4">
            {/* Progress bar */}
            <div className="mb-4">
              <div 
                className="h-2 bg-muted rounded-full cursor-pointer relative group"
                onClick={handleProgressClick}
              >
                {/* Buffered */}
                <div 
                  className="absolute h-full bg-muted-foreground/30 rounded-full"
                  style={{ width: `${(buffered / duration) * 100}%` }}
                />
                {/* Played */}
                <div 
                  className="absolute h-full bg-primary rounded-full"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {/* Handle */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center justify-between">
              {/* Left - Secondary controls */}
              <div className="flex items-center gap-2">
                {/* Chapters */}
                <button
                  onClick={() => {
                    setShowChapters(!showChapters);
                    setShowBookmarks(false);
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showChapters ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                  title="Chapters (C)"
                >
                  <List className="h-5 w-5" />
                </button>
                
                {/* Bookmarks */}
                <button
                  onClick={() => {
                    setShowBookmarks(!showBookmarks);
                    setShowChapters(false);
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showBookmarks ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                  title="Bookmarks (B)"
                >
                  <Bookmark className="h-5 w-5" />
                </button>
                
                {/* Add bookmark */}
                <button
                  onClick={addBookmark}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Add bookmark"
                >
                  <BookmarkPlus className="h-5 w-5" />
                </button>
              </div>
              
              {/* Center - Main playback */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => skip(-30)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Skip back 30s"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                
                <button
                  onClick={togglePlay}
                  className="p-4 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </button>
                
                <button
                  onClick={() => skip(30)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Skip forward 30s"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>
              
              {/* Right - Additional controls */}
              <div className="flex items-center gap-2">
                {/* Sleep timer indicator */}
                {sleepTimer && (
                  <button
                    onClick={cancelSleepTimer}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-amber-500 bg-amber-500/10 rounded-lg hover:bg-amber-500/20"
                    title="Cancel sleep timer"
                  >
                    <Moon className="h-3 w-3" />
                    {formatDuration(Math.max(0, (sleepTimer.endTime - Date.now()) / 1000))}
                  </button>
                )}
                
                {/* Sleep timer */}
                <button
                  onClick={() => setShowSleepTimer(!showSleepTimer)}
                  className={cn(
                    "p-2 rounded-lg transition-colors relative",
                    showSleepTimer ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                  title="Sleep timer"
                >
                  <Clock className="h-5 w-5" />
                </button>
                
                {/* Speed */}
                <button
                  onClick={cyclePlaybackRate}
                  className="px-2 py-1 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                  title="Playback speed (S)"
                >
                  {playbackRate}x
                </button>
                
                {/* Volume */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Mute (M)"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-muted rounded-full appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Transcript toggle */}
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showTranscript ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                  title="Transcript (T)"
                >
                  <FileText className="h-5 w-5" />
                </button>
                
                {/* Fullscreen */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right sidebar - Transcript */}
        {showTranscript && (
          <div className="w-96 border-l border-border bg-card flex flex-col">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="font-semibold">Transcript</h3>
              <button
                onClick={() => setShowTranscript(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div 
              ref={transcriptRef}
              className="flex-1 overflow-y-auto p-4"
              onMouseUp={handleTextSelection}
            >
              {transcript ? (
                <>
                  {/* Extract button for selected text */}
                  {selectedText && (
                    <div className="sticky top-0 mb-4 p-2 bg-primary/10 rounded-lg flex items-center justify-between">
                      <span className="text-sm text-primary truncate flex-1 mr-2">
                        {selectedText.substring(0, 50)}...
                      </span>
                      <button
                        onClick={createExtractFromSelection}
                        className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90"
                      >
                        Extract
                      </button>
                    </div>
                  )}
                  
                  {/* Transcript segments */}
                  <div className="space-y-2">
                    {transcript.segments.map((segment) => (
                      <div
                        key={segment.id}
                        id={`segment-${segment.id}`}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-colors",
                          activeSegmentId === segment.id
                            ? "bg-primary/10 border-l-4 border-primary"
                            : "hover:bg-muted/50 border-l-4 border-transparent"
                        )}
                        onClick={() => seek(segment.startTime)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(segment.startTime)}
                          </span>
                          {segment.speaker && (
                            <span className="text-xs text-primary">{segment.speaker}</span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{segment.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : document.content ? (
                // Plain text content (no timestamped transcript)
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: document.content }}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transcript available</p>
                  <p className="text-sm mt-1">
                    Import a transcript from the document menu
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Sleep timer popup */}
      {showSleepTimer && (
        <div className="absolute bottom-20 right-4 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
          <h4 className="font-medium mb-3">Sleep Timer</h4>
          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 45, 60, 90, 120].map(minutes => (
              <button
                key={minutes}
                onClick={() => startSleepTimer(minutes)}
                className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                {minutes}m
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSleepTimer(false)}
            className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Extract dialog */}
      <CreateExtractDialog
        isOpen={isExtractDialogOpen}
        onClose={() => {
          setIsExtractDialogOpen(false);
          setSelectedText("");
        }}
        documentId={document.id}
        initialText={selectedText}
        pageNumber={Math.floor(currentTime)} // Use time as "page" for audio
      />
    </div>
  );
}
