/**
 * YouTube Viewer Component
 * Displays YouTube videos with synchronized transcript
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, PlayCircle, Volume2, VolumeX, Maximize, Settings, Youtube, Clock, ExternalLink, Share2 } from "lucide-react";
import { useToast } from "../common/Toast";
import { TranscriptSync, TranscriptSegment } from "../media/TranscriptSync";
import { invokeCommand as invoke } from "../../lib/tauri";
import { getYouTubeEmbedURL, getYouTubeEmbedURLNoCookie, getYouTubeWatchURL, formatDuration } from "../../api/youtube";
import { getDocumentAuto, updateDocument, updateDocumentProgressAuto } from "../../api/documents";
import { generateShareUrl, generateYouTubeShareUrl, copyShareLink, DocumentState, parseStateFromUrl } from "../../lib/shareLink";
import { saveDocumentPosition, timePosition } from "../../api/position";
import { isTauri, openInWebviewWindow } from "../../lib/tauri";

interface YouTubeViewerProps {
  videoId: string;
  documentId?: string;
  title?: string;
  onLoad?: (metadata: { duration: number; title: string }) => void;
  onTranscriptLoad?: (segments: Array<{ text: string; start: number; end: number }>) => void;
  onTimeUpdate?: (time: number) => void;
  onSelectionChange?: (text: string) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Auto-save interval (in milliseconds) - save position every 5 seconds
const AUTO_SAVE_INTERVAL = 5000;

export function YouTubeViewer({ 
  videoId, 
  documentId, 
  title, 
  onLoad,
  onTranscriptLoad,
  onTimeUpdate,
  onSelectionChange,
}: YouTubeViewerProps) {
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
  const onTranscriptLoadRef = useRef(onTranscriptLoad);
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
  const [transcriptLayout, setTranscriptLayout] = useState<'below' | 'side'>('below');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [positionLoaded, setPositionLoaded] = useState(false);
  // Default to iframe fallback in Tauri to avoid WebView crashes with YouTube API
  const [useIframeFallback, setUseIframeFallback] = useState(() => isTauri());
  // Track if the embed actually fails to load (for Tauri fallback)
  const [embedFailed, setEmbedFailed] = useState(false);
  const [isLoadingEmbed, setIsLoadingEmbed] = useState(false);
  const [tauriEmbedMode, setTauriEmbedMode] = useState<"standard" | "nocookie">("standard");
  const [allowTauriInlineEmbed, setAllowTauriInlineEmbed] = useState(() => !isTauri());
  const [resolvedTitle, setResolvedTitle] = useState<string | undefined>(title);
  const embedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleFetchRef = useRef<string | null>(null);

  // Update refs when values change
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    onTranscriptLoadRef.current = onTranscriptLoad;
  }, [onTranscriptLoad]);

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

  // Cleanup embed timeout on unmount or video change
  useEffect(() => {
    return () => {
      if (embedTimeoutRef.current) {
        clearTimeout(embedTimeoutRef.current);
        embedTimeoutRef.current = null;
      }
    };
  }, [videoId]);

  // Reset embed state when video changes
  useEffect(() => {
    setEmbedFailed(false);
    setIsLoadingEmbed(false);
    setTauriEmbedMode("standard");
  }, [videoId]);

  // Start a timeout for Tauri iframe embeds so we can fallback cleanly if it never loads
  useEffect(() => {
    if (!useIframeFallback || !isTauri() || embedFailed || !allowTauriInlineEmbed) return;
    if (embedTimeoutRef.current) return;

    setIsLoadingEmbed(true);
    embedTimeoutRef.current = setTimeout(() => {
      if (tauriEmbedMode === "standard") {
        setTauriEmbedMode("nocookie");
      } else {
        setEmbedFailed(true);
      }
      setIsLoadingEmbed(false);
      embedTimeoutRef.current = null;
    }, 10000);

    return () => {
      if (embedTimeoutRef.current) {
        clearTimeout(embedTimeoutRef.current);
        embedTimeoutRef.current = null;
      }
    };
  }, [embedFailed, tauriEmbedMode, useIframeFallback, videoId]);

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
      
      // Notify parent component of transcript load
      onTranscriptLoadRef.current?.(segments);
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

    try {
      // Check if container is still valid
      if (!containerRef.current) {
        console.warn('[YouTubeViewer] Container ref is no longer valid');
        return;
      }

      // Clear any existing content in the container to prevent DOM conflicts
      if (containerRef.current.firstChild) {
        containerRef.current.innerHTML = '';
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
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
                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    const time = playerRef.current.getCurrentTime();
                    setCurrentTime(time);
                    onTimeUpdateRef.current?.(time);
                  }
                } catch (e) {
                  // Player might have been destroyed
                }
              }, 500);

              // Start auto-save interval (use ref to check playing state)
              if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
              autoSaveIntervalRef.current = setInterval(() => {
                try {
                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isPlayingRef.current) {
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
    // Don't load YouTube API in Tauri or when using iframe fallback - it causes crashes
    if (useIframeFallback) {
      console.log('[YouTubeViewer] Skipping YouTube API load (using iframe fallback)');
      // Clean up any existing player on unmount
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
      };
    }

    if (window.YT && window.YT.Player) {
      initializePlayer();
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
      // Destroy player and clear DOM to prevent React cleanup errors
      // The YouTube API replaces our container div with an iframe, which confuses React
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } catch (e) {
        // Ignore errors on destroy
      }
      // Clear the container's innerHTML to remove any leftover DOM nodes
      // This must happen AFTER player.destroy() to avoid React DOM mismatch errors
      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      } catch (e) {
        // Ignore errors if container is already gone
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
  const preferExternalPlayback = isTauri() && !allowTauriInlineEmbed;

  return (
    <div className={`flex h-full bg-background ${transcriptLayout === 'side' && showTranscript ? 'flex-row' : 'flex-col'}`}>
      {/* Video Player Container - Toggleable size */}
      <div 
        className={`relative bg-black flex-shrink-0 transition-all duration-300 ${transcriptLayout === 'side' && showTranscript ? 'w-1/2 h-full' : 'w-full'}`}
        style={transcriptLayout === 'side' && showTranscript ? {} : { 
          paddingBottom: showTranscript ? "40%" : "56.25%",
          minHeight: showTranscript ? "300px" : "auto"
        }}
      >
        {/* YouTube iframe */}
        {preferExternalPlayback ? (
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
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
                Inline playback is disabled in the desktop app to prevent freezes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => openInWebviewWindow(getYouTubeWatchURL(videoId), { 
                    title: resolvedTitle || title || "YouTube Video",
                    width: 1280,
                    height: 720
                  })}
                  className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                >
                  <Play className="w-5 h-5" />
                  Play in App Window
                </button>
                <a
                  href={getYouTubeWatchURL(videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open in Browser
                </a>
              </div>
              <button
                onClick={() => {
                  setAllowTauriInlineEmbed(true);
                  setEmbedFailed(false);
                  setTauriEmbedMode("standard");
                }}
                className="mt-4 text-xs text-gray-400 hover:text-gray-200 underline"
              >
                Try inline playback anyway
              </button>
            </div>
          </div>
        ) : useIframeFallback && !isTauri() ? (
          <iframe
            title={title || "YouTube video"}
            className="absolute inset-0 w-full h-full"
            src={getYouTubeEmbedURL(videoId, startTimeRef.current)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : useIframeFallback && isTauri() && !embedFailed ? (
          // Try standard embed first in Tauri, then fall back to privacy-enhanced if needed
          <>
            <iframe
              title={title || "YouTube video"}
              className="absolute inset-0 w-full h-full"
              src={
                tauriEmbedMode === "standard"
                  ? getYouTubeEmbedURL(videoId, startTimeRef.current)
                  : getYouTubeEmbedURLNoCookie(videoId, startTimeRef.current)
              }
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => {
                // Clear any pending timeout when iframe loads successfully
                if (embedTimeoutRef.current) {
                  clearTimeout(embedTimeoutRef.current);
                  embedTimeoutRef.current = null;
                }
                setIsLoadingEmbed(false);
              }}
              onError={() => {
                if (tauriEmbedMode === "standard") {
                  setTauriEmbedMode("nocookie");
                } else {
                  setEmbedFailed(true);
                }
                setIsLoadingEmbed(false);
              }}
            />
          </>
        ) : useIframeFallback && isTauri() && embedFailed ? (
          // Fallback: show thumbnail with open options
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
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
                Embedded playback couldn't be loaded. Choose how you'd like to watch:
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => openInWebviewWindow(getYouTubeWatchURL(videoId), { 
                    title: resolvedTitle || title || "YouTube Video",
                    width: 1280,
                    height: 720
                  })}
                  className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                >
                  <Play className="w-5 h-5" />
                  Play in App Window
                </button>
                <a
                  href={getYouTubeWatchURL(videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open in Browser
                </a>
              </div>
            </div>
          </div>
        ) : (
          // Wrapper div isolates YouTube's DOM manipulation from React
          <div className="absolute inset-0 w-full h-full">
            <div
              ref={containerRef}
              className="w-full h-full"
              id={`youtube-player-${videoId}`}
            />
          </div>
        )}

        {/* Loading overlay for non-Tauri or Tauri with working embed */}
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
              <p className="text-white">Loading player...</p>
            </div>
          </div>
        )}

        {/* Loading overlay for Tauri embed attempt */}
        {useIframeFallback && isTauri() && !embedFailed && isLoadingEmbed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="text-center">
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
              <p className="text-white mb-2">Loading video...</p>
              <p className="text-gray-400 text-sm">Trying privacy-enhanced mode</p>
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
      <div className={`flex-1 flex overflow-hidden ${transcriptLayout === 'side' && showTranscript ? 'w-1/2' : ''}`}>
        {/* Video info and transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video info header */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground line-clamp-2 mb-1">
                  {resolvedTitle || title}
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
            <div className="flex-1 overflow-hidden min-h-0">
              {isLoadingTranscript ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading transcript...
                  </div>
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
                  onSelectionChange={onSelectionChange}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground overflow-y-auto">
                  <div className="text-center max-w-md px-4 py-8">
                    <p className="mb-2">No transcript available for this video</p>
                    
                    {transcriptError ? (
                      <div className="mt-4 space-y-2">
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
                        ) : transcriptError.includes('bot detection') || transcriptError.includes('blocking transcript') || transcriptError.includes('Sign in to confirm') ? (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-600">
                              <strong>Bot Detection:</strong> YouTube is requiring sign-in for this video. To fix this, open YouTube in your browser first, or export your browser cookies for yt-dlp.
                            </p>
                          </div>
                        ) : transcriptError.includes('blocking') || transcriptError.includes('local development') || transcriptError.includes('anti-bot') ? (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-600">
                              <strong>YouTube Blocking:</strong> YouTube is blocking transcript requests. Try opening the video on YouTube first, then return here. Alternatively, you can still watch the video without transcripts.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Error: {transcriptError}
                          </p>
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
