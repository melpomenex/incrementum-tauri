/**
 * YouTube Viewer Component
 * Displays YouTube videos with synchronized transcript
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Youtube, Clock, ExternalLink, Share2 } from "lucide-react";
import { useToast } from "../common/Toast";
import { TranscriptSync, TranscriptSegment } from "../media/TranscriptSync";
import { invokeCommand as invoke } from "../../lib/tauri";
import { getYouTubeEmbedURL, getYouTubeWatchURL, formatDuration } from "../../api/youtube";
import { getDocumentAuto, updateDocumentProgressAuto } from "../../api/documents";
import { generateShareUrl, generateYouTubeShareUrl, copyShareLink, DocumentState, parseStateFromUrl } from "../../lib/shareLink";

interface YouTubeViewerProps {
  videoId: string;
  documentId?: string;
  title?: string;
  onLoad?: (metadata: { duration: number; title: string }) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Auto-save interval (in milliseconds) - save position every 5 seconds
const AUTO_SAVE_INTERVAL = 5000;

export function YouTubeViewer({ videoId, documentId, title, onLoad }: YouTubeViewerProps) {
  const playerRef = useRef<any>(null);
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const seekDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const documentIdRef = useRef(documentId);
  const onLoadRef = useRef(onLoad);
  const titleRef = useRef(title);
  const startTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [positionLoaded, setPositionLoaded] = useState(false);

  // Update refs when values change
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load transcript from backend
  const loadTranscript = useCallback(async () => {
    if (!videoId) return;

    setIsLoadingTranscript(true);
    try {
      const transcriptData = await invoke<Array<{ text: string; start: number; duration: number }>>(
        "get_youtube_transcript_by_id",
        { videoId, documentId }
      );

      const segments: TranscriptSegment[] = transcriptData.map((seg, i) => ({
        id: `seg-${i}`,
        start: seg.start,
        end: seg.start + seg.duration,
        text: seg.text,
      }));

      setTranscript(segments);
    } catch (error) {
      console.log("Transcript not available:", error);
      setTranscript([]);
    } finally {
      setIsLoadingTranscript(false);
    }
  }, [videoId, documentId]);

  // Handle videoId changes for transcript
  useEffect(() => {
    loadTranscript();
  }, [loadTranscript]);

  // Parse URL fragment to get initial timestamp
  useEffect(() => {
    const state = parseStateFromUrl();

    // Check if URL has a timestamp parameter
    if (state.time !== undefined) {
      setStartTime(state.time);
      setPositionLoaded(true); // URL timestamp takes precedence
      console.log(`[YouTubeViewer] Restoring timestamp from URL: ${state.time}s`);
    }
  }, [videoId]);

  // Load saved position from document
  const loadSavedPosition = useCallback(async () => {
    if (!documentId) {
      setPositionLoaded(true); // No document ID, so we're ready to play
      return;
    }

    try {
      const doc = await getDocumentAuto(documentId);
      if (doc && doc.current_page !== null && doc.current_page !== undefined) {
        const savedTime = doc.current_page;
        // For videos, current_page stores the timestamp in seconds
        // Only restore if the video has meaningful progress (>= 3 seconds)
        const hasProgress = savedTime >= 3;
        if (hasProgress) {
          setStartTime(savedTime);
          console.log(`Restoring video position: ${savedTime}s`);
        }
      }
    } catch (error) {
      console.log("Failed to load saved position:", error);
    } finally {
      setPositionLoaded(true); // Mark as loaded regardless of success/failure
    }
  }, [documentId]);

  // Save current position to document (use ref to avoid recreation)
  const saveCurrentPosition = useCallback(async (time: number) => {
    const currentDocumentId = documentIdRef.current;
    if (!currentDocumentId) return;

    // Avoid saving if time hasn't changed significantly (more than 1 second)
    if (Math.abs(time - lastSavedTimeRef.current) < 1) {
      return;
    }

    try {
      await updateDocumentProgressAuto(currentDocumentId, Math.floor(time));
      lastSavedTimeRef.current = time;
      console.log(`Saved video position: ${Math.floor(time)}s`);
    } catch (error) {
      console.log("Failed to save position:", error);
    }
  }, []);

  // Load saved position when component mounts
  useEffect(() => {
    loadSavedPosition();
  }, [loadSavedPosition]);

  // Initialize player (use refs to avoid circular dependencies)
  const initializePlayer = useCallback(() => {
    if (!containerRef.current) return;

    // Wait for position to be loaded before initializing
    if (!positionLoaded) {
      console.log('[YouTubeViewer] Waiting for position to load before initializing player...');
      return;
    }

    // If player already exists
    if (playerRef.current) {
      // Only load if videoId changed
      if (videoId !== lastVideoIdRef.current) {
        if (typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById(videoId, startTimeRef.current);
          lastVideoIdRef.current = videoId;
        }
      }
      return;
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      host: 'https://www.youtube.com',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        start: startTimeRef.current,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          setIsReady(true);
          const playerDuration = event.target.getDuration() || 0;
          setDuration(playerDuration);
          onLoadRef.current?.({ duration: playerDuration, title: titleRef.current || "" });

          // Seek to saved position if we have one
          if (startTimeRef.current > 0) {
            event.target.seekTo(startTimeRef.current, true);
            console.log(`Seeked to saved position: ${startTimeRef.current}s`);
          }

          // Start time tracking
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
              const time = playerRef.current.getCurrentTime();
              setCurrentTime(time);
            }
          }, 500);

          // Start auto-save interval (use ref to check playing state)
          if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
          autoSaveIntervalRef.current = setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isPlayingRef.current) {
              const time = playerRef.current.getCurrentTime();
              saveCurrentPosition(time);
            }
          }, AUTO_SAVE_INTERVAL);
        },
        onStateChange: (event: any) => {
          const playerState = event.target.getPlayerState();
          const wasPlaying = isPlayingRef.current;
          const isNowPlaying = playerState === window.YT.PlayerState.PLAYING;
          isPlayingRef.current = isNowPlaying;
          setIsPlaying(isNowPlaying);

          // Save position when pausing
          if (wasPlaying && playerState === window.YT.PlayerState.PAUSED) {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
              saveCurrentPosition(playerRef.current.getCurrentTime());
            }
          }
        },
        onError: (event: any) => {
          console.error("YouTube player error:", event.data);
        },
      },
    });
    lastVideoIdRef.current = videoId;
  }, [videoId, saveCurrentPosition]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initializePlayer();
      return;
    }

    // Check if script is already present
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady();
      initializePlayer();
    };

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      if (seekDebounceRef.current) {
        clearTimeout(seekDebounceRef.current);
        seekDebounceRef.current = null;
      }
      // Save position before unmount (use ref to avoid dependency)
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && documentIdRef.current) {
        const time = playerRef.current.getCurrentTime();
        saveCurrentPosition(time);
      }
      // We don't destroy the player on unmount if we want to reuse it,
      // but React strict mode might cause double mounting.
      // Safer to destroy.
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [initializePlayer, saveCurrentPosition, positionLoaded]);

  // Seek to time
  const handleSeek = useCallback((time: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);

      // Debounce save when user manually seeks (to avoid excessive saves during scrubbing)
      if (seekDebounceRef.current) {
        clearTimeout(seekDebounceRef.current);
      }
      seekDebounceRef.current = setTimeout(() => {
        saveCurrentPosition(time);
      }, 500); // Save 500ms after user stops seeking
    }
  }, [saveCurrentPosition]);

  // Play/Pause
  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  // Volume control
  const handleVolumeChange = (newVolume: number) => {
    if (!playerRef.current) return;

    setVolume(newVolume);
    if (playerRef.current.setVolume) {
      playerRef.current.setVolume(newVolume);
    }

    if (newVolume === 0) {
      setIsMuted(true);
      if (playerRef.current.mute) {
        playerRef.current.mute();
      }
    } else {
      setIsMuted(false);
      if (playerRef.current.unMute) {
        playerRef.current.unMute();
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;

    if (isMuted) {
      setIsMuted(false);
      if (playerRef.current.unMute) {
        playerRef.current.unMute();
      }
      if (playerRef.current.setVolume) {
        playerRef.current.setVolume(volume);
      }
    } else {
      setIsMuted(true);
      if (playerRef.current.mute) {
        playerRef.current.mute();
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

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
    a.download = `${title || videoId}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Share video with current timestamp
  const handleShare = async () => {
    // Generate YouTube share URL with current timestamp
    const shareUrl = generateYouTubeShareUrl(videoId, currentTime);

    // Copy to clipboard
    const success = await copyShareLink(shareUrl);
    if (success) {
      toast.success("Link copied!", "The timestamped video link has been copied to your clipboard.");
    } else {
      toast.error("Failed to copy", "Could not copy the link to clipboard.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Video Player Container */}
      <div className="relative bg-black" style={{ paddingBottom: "56.25%" }}>
        {/* YouTube iframe */}
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          id={`youtube-player-${videoId}`}
        />

        {/* Loading overlay */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
              <p className="text-white">Loading player...</p>
            </div>
          </div>
        )}

        {/* Custom controls overlay */}
        {isReady && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
            {/* Progress bar */}
            <div
              className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                handleSeek(percent * duration);
              }}
            >
              <div
                className="h-full bg-red-500 rounded-full relative"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="text-white hover:text-red-400 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-red-400 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>

                {/* Time */}
                <div className="text-white text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2">
                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="text-white hover:text-red-400 transition-colors"
                  title="Share with timestamp"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                {/* YouTube link */}
                <a
                  href={getYouTubeWatchURL(videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-red-400 transition-colors p-1"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-red-400 transition-colors"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content area with transcript toggle */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video info and transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video info header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground line-clamp-2 mb-1">
                  {title}
                </h2>
                {duration > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {formatDuration(duration)}
                  </p>
                )}
              </div>

              {/* Transcript toggle button */}
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="ml-4 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors flex items-center gap-2"
              >
                <span className="font-medium">Transcript</span>
                <span className="text-xs text-muted-foreground">
                  {showTranscript ? "▼" : "▶"}
                </span>
              </button>
            </div>
          </div>

          {/* Transcript panel */}
          {showTranscript && (
            <div className="flex-1 overflow-hidden">
              {isLoadingTranscript ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading transcript...
                </div>
              ) : transcript.length > 0 ? (
                <TranscriptSync
                  segments={transcript}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  autoScroll={true}
                  showTimestamps={true}
                  showSpeakers={false}
                  onExport={handleExportTranscript}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="mb-2">No transcript available for this video</p>
                    <p className="text-sm">
                      Transcripts are available if the video has closed captions or subtitles
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
