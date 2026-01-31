/**
 * YouTube Viewer Component
 * Displays YouTube videos with synchronized transcript and SponsorBlock integration
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Play, Clock, ExternalLink, Share2, Youtube, AlertTriangle, SkipForward, Loader2, GripVertical } from "lucide-react";
import { useToast } from "../common/Toast";
import { TranscriptSync, TranscriptSegment } from "../media/TranscriptSync";
import { invokeCommand as invoke } from "../../lib/tauri";
import { getYouTubeWatchURL, formatDuration } from "../../api/youtube";
import { fetchYouTubeTranscript } from "../../utils/youtubeTranscriptBrowser";
import { getDocumentAuto, updateDocument, updateDocumentProgressAuto } from "../../api/documents";
import { generateYouTubeShareUrl, copyShareLink, parseStateFromUrl } from "../../lib/shareLink";
import { saveDocumentPosition, timePosition } from "../../api/position";
import { isTauri } from "../../lib/tauri";
import YouTube, { YouTubeProps, YouTubePlayer } from "react-youtube";
import { 
  fetchSponsorBlockSegments, 
  SponsorBlockSegment, 
  getCategoryDisplayName,
  getCategoryColor
} from "../../api/sponsorblock";

interface YouTubeViewerProps {
  videoId: string;
  documentId?: string;
  title?: string;
  onLoad?: (metadata: { duration: number; title: string }) => void;
  onTranscriptLoad?: (segments: Array<{ text: string; start: number; end: number }>) => void;
  onTimeUpdate?: (time: number) => void;
  onSelectionChange?: (text: string) => void;
}

export function YouTubeViewer({ 
  videoId, 
  documentId, 
  title, 
  onLoad,
  onTranscriptLoad,
  onTimeUpdate,
  onSelectionChange,
}: YouTubeViewerProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const documentIdRef = useRef(documentId);
  const onTranscriptLoadRef = useRef(onTranscriptLoad);
  const titleRef = useRef(title);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(() => {
    const saved = localStorage.getItem('transcript-visibility');
    return saved !== 'false';
  });
  const [transcriptLayout, setTranscriptLayout] = useState<'below' | 'side'>('below');
  
  // Resizable transcript panel state
  const [transcriptWidth, setTranscriptWidth] = useState(() => {
    const saved = localStorage.getItem('transcript-panel-width');
    return saved ? parseInt(saved, 10) : 400; // Default 400px
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [resolvedTitle, setResolvedTitle] = useState<string | undefined>(title);
  const titleFetchRef = useRef<string | null>(null);
  const [showInlinePlayer, setShowInlinePlayer] = useState(false);
  const [playerReloadKey, setPlayerReloadKey] = useState(0);
  
  // SponsorBlock state
  const [segments, setSegments] = useState<SponsorBlockSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const lastSkippedSegmentIdRef = useRef<string | null>(null);

  // Update refs when values change
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  useEffect(() => {
    onTranscriptLoadRef.current = onTranscriptLoad;
  }, [onTranscriptLoad]);

  useEffect(() => {
    titleRef.current = title;
    setResolvedTitle(title);
  }, [title]);

  // Persist transcript visibility to localStorage
  useEffect(() => {
    localStorage.setItem('transcript-visibility', String(showTranscript));
  }, [showTranscript]);

  // Persist transcript width to localStorage
  useEffect(() => {
    localStorage.setItem('transcript-panel-width', String(transcriptWidth));
  }, [transcriptWidth]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    resizeStartXRef.current = clientX;
    resizeStartWidthRef.current = transcriptWidth;
    
    // Add resize cursor to body
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [transcriptWidth]);

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const delta = resizeStartXRef.current - clientX; // Inverted: dragging left increases width
      const newWidth = Math.max(250, Math.min(800, resizeStartWidthRef.current + delta));
      setTranscriptWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing]);

  // Load SponsorBlock segments
  useEffect(() => {
    if (!videoId) return;
    
    const loadSegments = async () => {
      const fetchedSegments = await fetchSponsorBlockSegments(videoId);
      console.log(`[SponsorBlock] Loaded ${fetchedSegments.length} segments for ${videoId}`);
      setSegments(fetchedSegments);
    };
    
    loadSegments();
  }, [videoId]);

  // Load transcript from backend
  const loadTranscript = useCallback(async () => {
    if (!videoId) return;

    setIsLoadingTranscript(true);
    setTranscriptError(null);
    try {
      let segments: TranscriptSegment[] = [];
      let fetchedDuration = 0;

      if (isTauri()) {
        // Use Tauri backend for desktop app
        const transcriptData = await invoke<Array<{ text: string; start: number; duration: number }> | null>(
          "get_youtube_transcript_by_id",
          { videoId, documentId }
        );

        if (!transcriptData || !Array.isArray(transcriptData)) {
          setTranscript([]);
          return;
        }

        segments = transcriptData.map((seg, i) => ({
          id: `seg-${i}`,
          start: seg.start,
          end: seg.start + seg.duration,
          text: seg.text,
        }));
        fetchedDuration = segments[segments.length - 1]?.end || 0;
      } else {
        // Use web API for browser app
        console.log('[YouTubeViewer] Fetching transcript via web API...');
        const result = await fetchYouTubeTranscript(videoId);

        segments = result.segments.map((seg, i) => ({
          id: `seg-${i}`,
          start: seg.start,
          end: seg.start + seg.duration,
          text: seg.text,
        }));
        fetchedDuration = segments[segments.length - 1]?.end || 0;
      }

      setTranscript(segments);
      setDuration(fetchedDuration);

      // Notify parent component of transcript load
      onTranscriptLoadRef.current?.(segments);
      onLoad?.({ duration: fetchedDuration, title: titleRef.current || "" });
    } catch (error) {
      console.log("Transcript not available:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setTranscriptError(errorMsg);
      setTranscript([]);
    } finally {
      setIsLoadingTranscript(false);
    }
  }, [videoId, documentId, onLoad]);

  // Handle videoId changes for transcript
  useEffect(() => {
    loadTranscript();
  }, [loadTranscript]);

  // Resolve YouTube title
  useEffect(() => {
    if (!videoId || !documentId) return;
    const currentTitle = (titleRef.current || "").trim();
    const looksLikeUrl = currentTitle.startsWith("http") || currentTitle.startsWith("YouTube:");
    if (!looksLikeUrl) return;
    if (titleFetchRef.current === videoId) return;

    titleFetchRef.current = videoId;
    (async () => {
      try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data?.title) return;
        setResolvedTitle(data.title);
        await updateDocument(documentId, { title: data.title } as any);
      } catch (error) {
        console.warn("Failed to resolve YouTube title:", error);
      }
    })();
  }, [documentId, videoId]);

  // Parse URL fragment to get initial timestamp
  useEffect(() => {
    const state = parseStateFromUrl();
    if (state.time !== undefined) {
      setStartTime(state.time);
      console.log(`[YouTubeViewer] Restoring timestamp from URL: ${state.time}s`);
    }
  }, [videoId]);

  // Load saved position from document
  useEffect(() => {
    if (!documentId) return;
    
    (async () => {
      try {
        const doc = await getDocumentAuto(documentId);
        const savedTime = doc?.current_page ?? doc?.currentPage;
        if (savedTime !== null && savedTime !== undefined && savedTime >= 3) {
          setStartTime(savedTime);
          console.log(`Restoring video position: ${savedTime}s`);
        }
      } catch (error) {
        console.log("Failed to load saved position:", error);
      }
    })();
  }, [documentId]);

  // Save current position to document
  const saveCurrentPosition = useCallback(async (time: number) => {
    const currentDocumentId = documentIdRef.current;
    if (!currentDocumentId) return;
    if (Math.abs(time - lastSavedTimeRef.current) < 1) return;

    try {
      await updateDocumentProgressAuto(currentDocumentId, Math.floor(time));
      await saveDocumentPosition(currentDocumentId, timePosition(Math.floor(time), duration));
      lastSavedTimeRef.current = time;
      console.log(`Saved video position: ${Math.floor(time)}s`);
    } catch (error) {
      console.log("Failed to save position:", error);
    }
  }, [duration]);

  // Monitor playback for SponsorBlock segments and position saving
  useEffect(() => {
    if (!isPlaying || !playerRef.current) return;

    const intervalId = setInterval(async () => {
      try {
        const time = await playerRef.current.getCurrentTime();
        setCurrentTime(time);
        
        // Notify parent
        onTimeUpdate?.(time);
        
        // Save position periodically (every 5 seconds roughly via saveCurrentPosition check)
        saveCurrentPosition(time);

        // Check SponsorBlock segments
        if (segments.length > 0) {
          for (const segment of segments) {
            const [start, end] = segment.segment;
            
            // If current time is within a segment and we haven't just skipped it
            if (time >= start && time < end) {
              if (lastSkippedSegmentIdRef.current !== segment.UUID) {
                // Skip segment
                playerRef.current.seekTo(end, true);
                lastSkippedSegmentIdRef.current = segment.UUID;
                
                // Show toast
                const categoryName = getCategoryDisplayName(segment.category);
                toast.info(`Skipped ${categoryName}`, "SponsorBlock");
                console.log(`[SponsorBlock] Skipped ${categoryName} (${start.toFixed(1)}s - ${end.toFixed(1)}s)`);
              }
            } else if (time >= end && lastSkippedSegmentIdRef.current === segment.UUID) {
              // Reset skipped flag once we're past the segment
              // This is a simplification; handling seeking back is trickier but this covers forward playback
              // We don't strictly need to clear it, but it helps if user seeks back before the segment
            }
          }
        }
      } catch (e) {
        // Ignore errors from player (e.g. if it's not ready)
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [isPlaying, segments, saveCurrentPosition, onTimeUpdate, toast]);

  // Seek to time - opens video at specific timestamp
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    setStartTime(time);
    saveCurrentPosition(time);

    if (showInlinePlayer && playerRef.current) {
      playerRef.current.seekTo(time, true);
    } else {
      setShowInlinePlayer(true);
    }

    toast.success("Seeking", `Starting at ${formatTime(time)}`);
  }, [videoId, resolvedTitle, title, saveCurrentPosition, toast, showInlinePlayer]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Share video with current timestamp
  const handleShare = async () => {
    const shareUrl = generateYouTubeShareUrl(videoId, currentTime);
    const success = await copyShareLink(shareUrl);
    if (success) {
      toast.success("Link copied!", "The timestamped video link has been copied to your clipboard.");
    } else {
      toast.error("Failed to copy", "Could not copy the link to clipboard.");
    }
  };

  const handlePlayVideo = () => {
    setShowInlinePlayer(true);
  };

  // YouTube Player Event Handlers
  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    
    // Resume at start time if set
    if (startTime > 0) {
      event.target.seekTo(startTime, true);
    }
  };

  const onPlayerStateChange = (event: any) => {
    // Player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    setIsPlaying(event.data === 1);
    
    if (event.data === 1) { // Playing
      // Ensure duration is set
      const d = event.target.getDuration();
      if (d && d > 0) setDuration(d);
    }
  };

  const displayTitle = resolvedTitle || title || "YouTube Video";

  const youtubeOpts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      start: Math.floor(startTime),
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin,
    },
  };

  // Calculate video container style based on layout
  const getVideoContainerStyle = () => {
    if (transcriptLayout === 'side' && showTranscript) {
      return {
        paddingBottom: '60px',
        flex: 1,
      };
    }
    return {
      paddingBottom: showTranscript ? "40%" : "56.25%",
      minHeight: showTranscript ? "300px" : "auto",
    };
  };

  return (
    <div className={`flex h-full bg-background ${transcriptLayout === 'side' && showTranscript ? 'flex-row' : 'flex-col'}`}>
      {/* Video Player Container */}
      <div
        ref={containerRef}
        className={`relative bg-black flex-shrink-0 transition-all duration-300 ${transcriptLayout === 'side' && showTranscript ? 'h-full' : 'w-full'}`}
        style={getVideoContainerStyle()}
      >
        {/* Inline Player */}
        {showInlinePlayer ? (
          <div className="absolute inset-0 w-full h-full">
            <YouTube
              videoId={videoId}
              opts={youtubeOpts}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              className="w-full h-full"
              iframeClassName="w-full h-full"
            />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
            <div className="text-center p-6 max-w-xl w-full">
              {/* Thumbnail */}
              <div 
                className="relative mb-6 group cursor-pointer rounded-xl overflow-hidden shadow-2xl"
                onClick={handlePlayVideo}
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt={displayTitle}
                  className="w-full aspect-video object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }}
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                </div>
                {/* Resume badge */}
                {startTime > 0 && (
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Resume from {formatTime(startTime)}
                  </div>
                )}
                
                {/* Segments badge */}
                {segments.length > 0 && (
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <SkipForward className="w-4 h-4" />
                    {segments.length} Skippable Segments
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-white text-lg font-semibold mb-2 line-clamp-2">
                {displayTitle}
              </h3>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handlePlayVideo}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg shadow-red-600/20"
                >
                  <Play className="w-5 h-5" />
                  {startTime > 0 ? `Resume from ${formatTime(startTime)}` : "Play Video"}
                </button>
                
                <button
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium border border-gray-700"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>

                <a
                  href={getYouTubeWatchURL(videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium border border-gray-700"
                >
                  <ExternalLink className="w-5 h-5" />
                  Browser
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resize handle - only in side mode with transcript visible */}
      {transcriptLayout === 'side' && showTranscript && (
        <div
          className={`w-1 flex-shrink-0 relative z-10 ${isResizing ? 'bg-primary' : 'bg-border hover:bg-primary/50'} cursor-ew-resize transition-colors`}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          title="Drag to resize"
        >
          {/* Visual grip indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 rounded bg-background/80 shadow-sm">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Content area with transcript toggle */}
      <div 
        className="flex flex-col overflow-hidden"
        style={transcriptLayout === 'side' && showTranscript ? { width: transcriptWidth } : { flex: 1 }}
      >
        {/* Video info and transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video info header */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground line-clamp-2 mb-1">
                  {displayTitle}
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {duration > 0 && <span>Duration: {formatDuration(duration)}</span>}
                  {segments.length > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <SkipForward className="w-3 h-3" />
                      SponsorBlock Enabled
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {/* Layout toggle - only show when transcript is visible */}
                {showTranscript && (
                  <button
                    onClick={() => setTranscriptLayout(transcriptLayout === 'below' ? 'side' : 'below')}
                    className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors flex items-center gap-2"
                    title={transcriptLayout === 'below' ? 'Switch to side-by-side view' : 'Switch to stacked view'}
                  >
                    <span className="text-xs">{transcriptLayout === 'below' ? '↔' : '↕'}</span>
                  </button>
                )}

                {/* Transcript toggle button */}
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors flex items-center gap-2"
                >
                  <span className="font-medium">{showTranscript ? "Hide" : "Show"} Transcript</span>
                  <span className="text-xs text-muted-foreground">
                    {showTranscript ? "▼" : "▶"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Transcript panel - fills available space */}
          {showTranscript && (
            <div className="flex-1 min-h-0 overflow-hidden">
              {isLoadingTranscript ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-sm">Loading transcript...</span>
                  </div>
                </div>
              ) : transcriptError ? (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="text-center max-w-md">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-foreground mb-2">Transcript Unavailable</h3>
                    <p className="text-xs text-muted-foreground">{transcriptError}</p>
                    {!isTauri() && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: Transcript fetching requires the API server to be running.
                      </p>
                    )}
                  </div>
                </div>
              ) : transcript.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="text-sm">No transcript available for this video.</p>
                  </div>
                </div>
              ) : (
                <TranscriptSync
                  segments={transcript}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  onSelectionChange={onSelectionChange}
                  className="h-full"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}