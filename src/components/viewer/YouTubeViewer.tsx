/**
 * YouTube Viewer Component
 * Displays YouTube videos with synchronized transcript
 * 
 * NOTE: YouTube iframe embeds are enabled for inline playback.
 * If a build environment blocks the embed, users can still open in a new window.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Play, Clock, ExternalLink, Share2, Youtube, AlertTriangle } from "lucide-react";
import { useToast } from "../common/Toast";
import { TranscriptSync, TranscriptSegment } from "../media/TranscriptSync";
import { invokeCommand as invoke } from "../../lib/tauri";
import { getYouTubeWatchURL, formatDuration } from "../../api/youtube";
import { getDocumentAuto, updateDocument, updateDocumentProgressAuto } from "../../api/documents";
import { generateYouTubeShareUrl, copyShareLink, parseStateFromUrl } from "../../lib/shareLink";
import { saveDocumentPosition, timePosition } from "../../api/position";
import { isTauri } from "../../lib/tauri";

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
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [resolvedTitle, setResolvedTitle] = useState<string | undefined>(title);
  const titleFetchRef = useRef<string | null>(null);
  const timeTrackingRef = useRef<NodeJS.Timeout | null>(null);
  const [showInlinePlayer, setShowInlinePlayer] = useState(false);
  const [playerReloadKey, setPlayerReloadKey] = useState(0);

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

  // Load transcript from backend
  const loadTranscript = useCallback(async () => {
    if (!videoId) return;

    setIsLoadingTranscript(true);
    setTranscriptError(null);
    try {
      const transcriptData = await invoke<Array<{ text: string; start: number; duration: number }> | null>(
        "get_youtube_transcript_by_id",
        { videoId, documentId }
      );

      if (!transcriptData || !Array.isArray(transcriptData)) {
        setTranscript([]);
        return;
      }

      const segments: TranscriptSegment[] = transcriptData.map((seg, i) => ({
        id: `seg-${i}`,
        start: seg.start,
        end: seg.start + seg.duration,
        text: seg.text,
      }));

      setTranscript(segments);
      setDuration(segments[segments.length - 1]?.end || 0);
      
      // Notify parent component of transcript load
      onTranscriptLoadRef.current?.(segments);
      onLoad?.({ duration: segments[segments.length - 1]?.end || 0, title: titleRef.current || "" });
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

  // Simulate time tracking for transcript sync (since video plays in external window)
  useEffect(() => {
    // When user clicks a transcript segment, we track time from there
    // In a real implementation, we'd communicate with the external window
    return () => {
      if (timeTrackingRef.current) {
        clearInterval(timeTrackingRef.current);
      }
    };
  }, []);

  // Seek to time - opens video at specific timestamp
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    setStartTime(time);
    saveCurrentPosition(time);

    if (showInlinePlayer) {
      setPlayerReloadKey((prev) => prev + 1);
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

  // Export transcript
  const handleExportTranscript = () => {
    if (transcript.length === 0) return;

    const text = transcript
      .map((seg) => `[${formatTime(seg.start)}] ${seg.text}`)
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resolvedTitle || title || videoId}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
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

  const embedOrigin = useMemo(() => window.location.origin, []);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      enablejsapi: "1",
      playsinline: "1",
      rel: "0",
      origin: embedOrigin,
    });

    if (startTime > 0) {
      params.set("start", String(Math.floor(startTime)));
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }, [videoId, startTime, embedOrigin]);

  // Open video in external window
  const handlePlayVideo = () => {
    setShowInlinePlayer(true);
  };

  const displayTitle = resolvedTitle || title || "YouTube Video";

  return (
    <div className={`flex h-full bg-background ${transcriptLayout === 'side' && showTranscript ? 'flex-row' : 'flex-col'}`}>
      {/* Video Player Container */}
      <div
        ref={containerRef}
        className={`relative bg-black flex-shrink-0 transition-all duration-300 ${transcriptLayout === 'side' && showTranscript ? 'w-1/2 h-full' : 'w-full'}`}
        style={transcriptLayout === 'side' && showTranscript ? {
          paddingBottom: '60px'
        } : {
          paddingBottom: showTranscript ? "40%" : "56.25%",
          minHeight: showTranscript ? "300px" : "auto"
        }}
      >
        {/* Inline Player */}
        {showInlinePlayer ? (
          <iframe
            key={`yt-${videoId}-${playerReloadKey}`}
            className="absolute inset-0 w-full h-full"
            src={embedUrl}
            title={displayTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
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

      {/* Content area with transcript toggle */}
      <div className={`flex-1 flex overflow-hidden ${transcriptLayout === 'side' && showTranscript ? 'w-1/2' : ''}`}>
        {/* Video info and transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video info header */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground line-clamp-2 mb-1">
                  {displayTitle}
                </h2>
                {duration > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {formatDuration(duration)}
                  </p>
                )}
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

          {/* Transcript panel - scrollable */}
          {showTranscript && (
            <div className="flex-1 overflow-y-auto min-h-0">
              <TranscriptSync
                segments={transcript}
                currentTime={currentTime}
                onSeek={handleSeek}
                onSelectionChange={onSelectionChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
