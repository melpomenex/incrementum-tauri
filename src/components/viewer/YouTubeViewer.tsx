/**
 * YouTube Viewer Component
 * Displays YouTube videos with synchronized transcript
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Youtube, Clock, ExternalLink, Share2 } from "lucide-react";
import { useToast } from "../common/Toast";
import { YouTubeCookieUpload } from "../settings/YouTubeCookieUpload";
import { TranscriptSync, TranscriptSegment } from "../media/TranscriptSync";
import { invokeCommand as invoke } from "../../lib/tauri";
import { getYouTubeEmbedURL, getYouTubeWatchURL, formatDuration } from "../../api/youtube";
import { getDocumentAuto, updateDocument, updateDocumentProgressAuto } from "../../api/documents";
import { generateShareUrl, generateYouTubeShareUrl, copyShareLink, DocumentState, parseStateFromUrl } from "../../lib/shareLink";
import { saveDocumentPosition, timePosition } from "../../api/position";
import { isTauri } from "../../lib/tauri";

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
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
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
  const isMountedRef = useRef(true);
  const playerInitializingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [positionLoaded, setPositionLoaded] = useState(false);
  // Default to iframe fallback in Tauri to avoid WebView crashes with YouTube API
  const [useIframeFallback, setUseIframeFallback] = useState(() => isTauri());
  const [resolvedTitle, setResolvedTitle] = useState<string | undefined>(title);
  const titleFetchRef = useRef<string | null>(null);

  // Update refs when values change
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    titleRef.current = title;
    setResolvedTitle(title);
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
    } catch (error) {
      console.log("Transcript not available:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setTranscriptError(errorMsg);
      setTranscript([]);
    } finally {
      setIsLoadingTranscript(false);
    }
  }, [videoId, documentId]);

  // Handle videoId changes for transcript
  useEffect(() => {
    loadTranscript();
  }, [loadTranscript]);

  // Resolve YouTube title in browser mode when document title is still a URL
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
      const savedTime = doc?.current_page ?? doc?.currentPage;
      if (savedTime !== null && savedTime !== undefined) {
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
      // Also save unified position
      await saveDocumentPosition(currentDocumentId, timePosition(Math.floor(time), duration));
      lastSavedTimeRef.current = time;
      console.log(`Saved video position: ${Math.floor(time)}s`);
    } catch (error) {
      console.log("Failed to save position:", error);
    }
  }, [duration]);

  // Load saved position when component mounts
  useEffect(() => {
    loadSavedPosition();
  }, [loadSavedPosition]);

  // Initialize player (use refs to avoid circular dependencies)
  const initializePlayer = useCallback(() => {
    if (useIframeFallback) return;
    if (!containerRef.current) return;
    if (!isMountedRef.current) return;
    
    // Prevent double initialization (React Strict Mode)
    if (playerInitializingRef.current) {
      console.log('[YouTubeViewer] Player already initializing, skipping...');
      return;
    }

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
          try {
            playerRef.current.loadVideoById(videoId, startTimeRef.current);
            lastVideoIdRef.current = videoId;
          } catch (error) {
            console.error('[YouTubeViewer] Failed to load video by ID:', error);
            setUseIframeFallback(true);
          }
        }
      }
      return;
    }
    
    playerInitializingRef.current = true;

    try {
      // Check if container is still valid
      if (!containerRef.current) {
        console.warn('[YouTubeViewer] Container ref is no longer valid');
        return;
      }

      // Create a dedicated div for the player to avoid React DOM conflicts
      // Clear any existing content first
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      const playerDiv = document.createElement('div');
      playerDiv.id = `youtube-player-inner-${videoId}-${Date.now()}`;
      containerRef.current.appendChild(playerDiv);
      playerContainerRef.current = playerDiv;

      playerRef.current = new window.YT.Player(playerDiv, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          start: startTimeRef.current,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: any) => {
            playerInitializingRef.current = false;
            if (!isMountedRef.current) return;
            
            try {
              setIsReady(true);
              const playerDuration = event.target?.getDuration() || 0;
              setDuration(playerDuration);
              onLoadRef.current?.({ duration: playerDuration, title: titleRef.current || "" });

              // Seek to saved position if we have one
              if (startTimeRef.current > 0 && event.target?.seekTo) {
                event.target.seekTo(startTimeRef.current, true);
                console.log(`Seeked to saved position: ${startTimeRef.current}s`);
              }

              // Start time tracking
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                try {
                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isMountedRef.current) {
                    const time = playerRef.current.getCurrentTime();
                    setCurrentTime(time);
                  }
                } catch (e) {
                  // Player might have been destroyed
                }
              }, 500);

              // Start auto-save interval (use ref to check playing state)
              if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
              autoSaveIntervalRef.current = setInterval(() => {
                try {
                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isPlayingRef.current && isMountedRef.current) {
                    const time = playerRef.current.getCurrentTime();
                    saveCurrentPosition(time);
                  }
                } catch (e) {
                  // Player might have been destroyed
                }
              }, AUTO_SAVE_INTERVAL);
            } catch (error) {
              console.error('[YouTubeViewer] Error in onReady handler:', error);
            }
          },
          onStateChange: (event: any) => {
            if (!isMountedRef.current) return;
            
            try {
              const playerState = event.target?.getPlayerState();
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
            } catch (error) {
              console.error('[YouTubeViewer] Error in onStateChange handler:', error);
            }
          },
          onError: (event: any) => {
            playerInitializingRef.current = false;
            console.error("[YouTubeViewer] Player error:", event.data);
            // Fallback to iframe on error
            if (event.data === 2 || event.data === 5 || event.data === 100 || event.data === 101 || event.data === 150) {
              console.log('[YouTubeViewer] Switching to iframe fallback due to player error');
              setUseIframeFallback(true);
            }
          },
        },
      });
      lastVideoIdRef.current = videoId;
    } catch (error) {
      console.error('[YouTubeViewer] Failed to initialize player:', error);
      // Fallback to iframe
      setUseIframeFallback(true);
    }
  }, [positionLoaded, saveCurrentPosition, useIframeFallback, videoId]);

  // Load YouTube IFrame API (skip if using iframe fallback, especially in Tauri)
  useEffect(() => {
    isMountedRef.current = true;
    
    // Don't load YouTube API in Tauri or when using iframe fallback - it causes crashes
    if (useIframeFallback) {
      console.log('[YouTubeViewer] Skipping YouTube API load (using iframe fallback)');
      // Clean up any existing player on unmount
      return () => {
        isMountedRef.current = false;
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
      };
    }

    if (window.YT && window.YT.Player) {
      initializePlayer();
      return () => {
        isMountedRef.current = false;
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
      };
    }

    // Check if script is already present
    let timeoutId: number | null = null;
    let didFallback = false;
    const shouldFallback = () => {
      if (didFallback) return;
      didFallback = true;
      console.log('[YouTubeViewer] Falling back to iframe mode');
      setUseIframeFallback(true);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      try {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        tag.onerror = () => {
          console.error('[YouTubeViewer] Failed to load YouTube API script');
          shouldFallback();
        };
        tag.onload = () => {
          console.log('[YouTubeViewer] YouTube API script loaded');
        };
        const firstScriptTag = document.getElementsByTagName("script")[0];
        if (firstScriptTag?.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      } catch (error) {
        console.error('[YouTubeViewer] Error loading YouTube API:', error);
        shouldFallback();
      }
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      console.log('[YouTubeViewer] YouTube API ready');
      if (previousOnReady) previousOnReady();
      initializePlayer();
    };

    timeoutId = window.setTimeout(() => {
      if (!window.YT || !window.YT.Player) {
        console.warn('[YouTubeViewer] YouTube API failed to load within timeout');
        shouldFallback();
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      playerInitializingRef.current = false;
      
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
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
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && documentIdRef.current) {
          const time = playerRef.current.getCurrentTime();
          saveCurrentPosition(time);
        }
      } catch (e) {
        // Ignore errors on unmount
      }
      // We don't destroy the player on unmount if we want to reuse it,
      // but React strict mode might cause double mounting.
      // Safer to destroy.
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          // Destroy the player but don't null it yet - let the cleanup happen
          playerRef.current.destroy();
        }
      } catch (e) {
        // Ignore errors on destroy
      }
      playerRef.current = null;
      
      // Clean up the player div we created
      if (playerContainerRef.current && playerContainerRef.current.parentNode) {
        try {
          playerContainerRef.current.parentNode.removeChild(playerContainerRef.current);
        } catch (e) {
          // Already removed or not in DOM
        }
        playerContainerRef.current = null;
      }
    };
  }, [initializePlayer, saveCurrentPosition, positionLoaded, useIframeFallback]);

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
    a.download = `${resolvedTitle || title || videoId}-transcript.txt`;
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

  const showOverlay = !useIframeFallback && !isReady;
  
  // Use a key to force remount when videoId or fallback mode changes
  // This prevents React DOM reconciliation issues with the YouTube API
  const playerKey = `${videoId}-${useIframeFallback ? 'iframe' : 'api'}`;

  return (
    <div key={playerKey} className="flex flex-col h-full bg-background">
      {/* Video Player Container - 16:9 aspect ratio */}
      <div className="relative w-full bg-black" style={{ paddingBottom: "56.25%", height: 0 }}>
        {/* YouTube iframe - don't render in Tauri as it causes crashes */}
        {useIframeFallback && !isTauri() ? (
          <iframe
            title={title || "YouTube video"}
            className="absolute inset-0 w-full h-full"
            style={{ width: '100%', height: '100%', border: 'none' }}
            src={getYouTubeEmbedURL(videoId, startTimeRef.current)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : useIframeFallback && isTauri() ? (
          // Placeholder div for Tauri - actual content is shown in overlay
          <div className="absolute inset-0 w-full h-full bg-black" />
        ) : (
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
          />
        )}

        {/* Loading overlay */}
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
              <p className="text-white">Loading player...</p>
            </div>
          </div>
        )}

        {/* Tauri browser open overlay - YouTube embeds crash Tauri WebView */}
        {useIframeFallback && isTauri() && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-center p-8 max-w-lg">
              <img
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt={title || "YouTube video thumbnail"}
                className="w-full rounded-lg shadow-2xl mb-6"
                onError={(e) => {
                  // Fallback to lower quality thumbnail
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-white text-lg font-semibold mb-2">
                {resolvedTitle || title || "YouTube Video"}
              </h3>
              <p className="text-gray-300 mb-6 text-sm">
                YouTube embeds are not compatible with Tauri's WebView. Please open the video in your browser.
              </p>
              <a
                href={getYouTubeWatchURL(videoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                Open in Browser
              </a>
            </div>
          </div>
        )}

        {/* Custom controls overlay */}
        {isReady && !useIframeFallback && (
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
                {resolvedTitle || title}
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
                  className="flex-1 h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center max-w-md px-4">
                    <p className="mb-2">No transcript available for this video</p>
                    
                    {transcriptError ? (
                      <div className="mt-4 space-y-3">
                        {transcriptError.includes('does not have captions') ? (
                          <p className="text-sm text-muted-foreground">
                            This video doesn&apos;t have captions or subtitles enabled by the creator.
                          </p>
                        ) : transcriptError.includes('age-restricted') ? (
                          <p className="text-sm text-muted-foreground">
                            This video is age-restricted and transcripts cannot be fetched.
                          </p>
                        ) : transcriptError.includes('requires consent') ? (
                          <p className="text-sm text-muted-foreground">
                            YouTube requires additional consent for this video. Transcripts cannot be fetched.
                          </p>
                        ) : transcriptError.includes('auth') || transcriptError.includes('expired') || transcriptError.includes('bot detection') || transcriptError.includes('blocking transcript') || transcriptError.includes('Sign in to confirm') || transcriptError.includes('automated') ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                              <p className="text-xs text-amber-600 mb-1">
                                <strong>YouTube Authentication Needed</strong>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                YouTube is blocking transcript requests. Upload your YouTube cookies below to fix this.
                              </p>
                            </div>
                            <YouTubeCookieUpload onCookiesUpdated={loadTranscript} />
                          </div>
                        ) : transcriptError.includes('CORS') || transcriptError.includes('local development') ? (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-600">
                              <strong>Development Mode:</strong> Transcript fetching requires CORS proxies in local development, which may be unreliable. Deploy to Vercel for full functionality.
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Error: {transcriptError}
                            </p>
                            <YouTubeCookieUpload onCookiesUpdated={loadTranscript} />
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Transcripts are available if the video has closed captions or subtitles
                      </p>
                    )}
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
