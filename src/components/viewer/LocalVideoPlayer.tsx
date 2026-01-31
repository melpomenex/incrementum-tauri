/**
 * Local Video Player Component
 * Plays local video files with position tracking, playback speed, and keyboard shortcuts
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCw,
  Settings,
  Clock,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { cn } from '../../utils';
import { saveDocumentPosition, timePosition } from '../../api/position';
import { getDocumentAuto, updateDocumentProgressAuto } from '../../api/documents';
import { useToast } from '../common/Toast';

interface LocalVideoPlayerProps {
  src: string; // Local file URL or blob URL
  documentId?: string;
  title?: string;
  onLoad?: (metadata: { duration: number; title: string }) => void;
  className?: string;
  mediaType?: "video" | "audio";
}

export function LocalVideoPlayer({
  src,
  documentId,
  title,
  onLoad,
  className = '',
  mediaType = "video",
}: LocalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const key = documentId ? `video-playback-rate-${documentId}` : 'video-playback-rate-default';
    const saved = localStorage.getItem(key);
    return saved ? parseFloat(saved) : 1;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  // Position tracking
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const startTimeRef = useRef(0);
  const lastSavedTimeRef = useRef(0);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const documentIdRef = useRef(documentId);

  // Update refs when values change
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  // Persist playback rate to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = documentId ? `video-playback-rate-${documentId}` : 'video-playback-rate-default';
    localStorage.setItem(key, String(playbackRate));
  }, [playbackRate, documentId]);

  // Load saved position from document
  const loadSavedPosition = useCallback(async () => {
    if (!documentId) {
      setPositionLoaded(true);
      return;
    }

    try {
      const doc = await getDocumentAuto(documentId);
      const savedTime = doc?.currentPage ?? doc?.current_page ?? 0;
      console.log("[LocalVideoPlayer] Loaded saved time:", {
        documentId,
        savedTime,
        mediaType,
        src,
      });
      if (savedTime >= 3) {
        // Update ref immediately so onLoadedMetadata can use it
        startTimeRef.current = savedTime;
        setStartTime(savedTime);
        // Seek immediately if video is already ready
        if (videoRef.current && videoRef.current.readyState >= 1) {
          videoRef.current.currentTime = savedTime;
          console.log(`[LocalVideoPlayer] Restored position immediately: ${savedTime}s`);
        }
        console.log(`[LocalVideoPlayer] Saved position set: ${savedTime}s`);
      }
    } catch (error) {
      console.log('[LocalVideoPlayer] Failed to load position:', error);
    } finally {
      setPositionLoaded(true);
    }
  }, [documentId, mediaType, src]);

  // Save current position
  const savePosition = useCallback(async (time: number) => {
    const currentDocumentId = documentIdRef.current;
    if (!currentDocumentId) return;

    // Avoid saving if time hasn't changed significantly
    if (Math.abs(time - lastSavedTimeRef.current) < 1) {
      return;
    }

    try {
      const roundedTime = Math.floor(time);
      console.log("[LocalVideoPlayer] Saving position:", {
        documentId: currentDocumentId,
        time: roundedTime,
        duration,
        mediaType,
      });
      await updateDocumentProgressAuto(currentDocumentId, roundedTime);
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        await saveDocumentPosition(
          currentDocumentId,
          timePosition(roundedTime, duration)
        );
      }
      lastSavedTimeRef.current = time;
    } catch (error) {
      console.log('[LocalVideoPlayer] Failed to save position:', error);
    }
  }, [duration, mediaType]);

  // Load position on mount
  useEffect(() => {
    loadSavedPosition();
  }, [loadSavedPosition]);

  // Set up auto-save interval (every 5 seconds while playing)
  useEffect(() => {
    const startAutoSave = () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      autoSaveIntervalRef.current = setInterval(() => {
        if (isPlaying && videoRef.current && documentIdRef.current) {
          savePosition(videoRef.current.currentTime);
        }
      }, 5000);
    };

    if (isPlaying) {
      startAutoSave();
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [isPlaying, savePosition]);

  // Save position when unmounting or pausing
  useEffect(() => {
    return () => {
      // Save on unmount
      if (videoRef.current && documentIdRef.current) {
        savePosition(videoRef.current.currentTime);
      }
    };
  }, [savePosition]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(Math.min(100, volume + 5));
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(Math.max(0, volume - 5));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'l':
          e.preventDefault();
          seekRelative(10);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          // Number keys seek to percentage
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const percent = parseInt(e.key) * 10;
            seekToPercentage(percent);
          }
          break;
        case '<':
          e.preventDefault();
          changePlaybackRate(Math.max(0.25, playbackRate - 0.25));
          break;
        case '>':
          e.preventDefault();
          changePlaybackRate(Math.min(2, playbackRate + 0.25));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, playbackRate]);

  // Toggle play/pause
  const togglePlay = async () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        setPlayError(null);
        try {
          await videoRef.current.play();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to play video';
          console.error('[LocalVideoPlayer] Play error:', errorMessage);
          setPlayError(errorMessage);
          toast.error('Playback Error', errorMessage);
        }
      } else {
        videoRef.current.pause();
      }
    }
  };

  // Seek relative to current position
  const seekRelative = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  // Seek to percentage
  const seekToPercentage = (percent: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = (duration * percent) / 100;
    }
  };

  // Adjust volume
  const adjustVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
      if (newVolume > 0) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Change playback rate
  const changePlaybackRate = (rate: number) => {
    const roundedRate = Math.round(rate * 100) / 100;
    setPlaybackRate(roundedRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = roundedRate;
    }
    toast.success(
      `Speed: ${roundedRate}x`,
      `Playback speed set to ${roundedRate}x`
    );
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const waveformBars = useMemo(() => {
    const seedSource = `${title || ''}|${src}`;
    let hash = 2166136261;
    for (let i = 0; i < seedSource.length; i += 1) {
      hash ^= seedSource.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    let state = hash >>> 0;
    const next = () => {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const bars: number[] = [];
    const barCount = 64;
    for (let i = 0; i < barCount; i += 1) {
      const rand = next();
      const shaped = Math.pow(rand, 0.55);
      const height = 0.18 + shaped * 0.82;
      bars.push(height);
    }

    return bars;
  }, [src, title]);

  // Handle scroll to seek
  const handleScroll = useCallback((e: React.WheelEvent) => {
    if (!videoRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Scroll down (positive deltaY) = forward
    // Scroll up (negative deltaY) = backward
    const delta = e.deltaY > 0 ? 5 : -5;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    
    // Show feedback toast for scroll seek
    const newTime = videoRef.current.currentTime;
    const direction = delta > 0 ? 'forward' : 'backward';
    toast.success(
      `${formatTime(newTime)}`,
      `Seeked ${direction} 5 seconds`
    );
  }, [duration, toast]);

  // Handle video click to toggle play/pause
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    // Only toggle if clicking directly on the video element, not controls
    if (e.target === videoRef.current) {
      togglePlay();
    }
  }, []);

  // Handle double click to toggle fullscreen
  const handleVideoDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === videoRef.current) {
      toggleFullscreen();
    }
  }, []);

  const mediaElement = mediaType === "audio" ? (
    <audio
      ref={videoRef}
      src={src}
      className="sr-only"
      onLoadedMetadata={() => {
        if (videoRef.current) {
          const mediaDuration = videoRef.current.duration;
          setDuration(mediaDuration);
          onLoad?.({ duration: mediaDuration, title: title || 'Audio' });
          if (startTimeRef.current > 0) {
            videoRef.current.currentTime = startTimeRef.current;
            console.log("[LocalVideoPlayer] Seeked audio to saved time:", startTimeRef.current);
          }
          // Apply saved playback rate
          if (playbackRate !== 1) {
            videoRef.current.playbackRate = playbackRate;
            console.log("[LocalVideoPlayer] Applied saved playback rate:", playbackRate);
          }
        }
      }}
      onCanPlay={() => {
        console.log("[LocalVideoPlayer] Audio can play");
        setPlayError(null);
      }}
      onWaiting={() => {
        console.log("[LocalVideoPlayer] Audio waiting for data");
      }}
      onPlay={() => setIsPlaying(true)}
      onPause={() => {
        setIsPlaying(false);
        if (videoRef.current && documentIdRef.current) {
          savePosition(videoRef.current.currentTime);
        }
      }}
      onTimeUpdate={() => {
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
        }
      }}
      onVolumeChange={() => {
        if (videoRef.current) {
          setVolume(videoRef.current.volume * 100);
          setIsMuted(videoRef.current.muted);
        }
      }}
      onError={(e) => {
        const error = videoRef.current?.error;
        let errorMessage = error
          ? `Error code ${error.code}: ${error.message}`
          : 'Unknown audio error';
        let userFriendlyMessage = errorMessage;

        // Provide codec-specific guidance for audio
        if (error?.code === 3) {
          userFriendlyMessage = 'This audio format is not supported by your browser. '
            + 'Please try converting to MP3, M4A, or WAV format.';
        } else if (error?.code === 4) {
          userFriendlyMessage = 'The audio file could not be loaded. It may be corrupted or in an unsupported format.';
        }

        console.error('[LocalVideoPlayer] Audio error:', errorMessage, e);
        setPlayError(userFriendlyMessage);
        toast.error('Audio Error', userFriendlyMessage);
      }}
    />
  ) : (
    <video
      ref={videoRef}
      src={src}
      className="w-full max-h-full bg-black cursor-pointer"
      onLoadedMetadata={() => {
        if (videoRef.current) {
          const mediaDuration = videoRef.current.duration;
          setDuration(mediaDuration);
          onLoad?.({ duration: mediaDuration, title: title || 'Video' });
          if (startTimeRef.current > 0) {
            videoRef.current.currentTime = startTimeRef.current;
            console.log("[LocalVideoPlayer] Seeked video to saved time:", startTimeRef.current);
          }
          // Apply saved playback rate
          if (playbackRate !== 1) {
            videoRef.current.playbackRate = playbackRate;
            console.log("[LocalVideoPlayer] Applied saved playback rate:", playbackRate);
          }
        }
      }}
      onCanPlay={() => {
        console.log("[LocalVideoPlayer] Video can play");
        setPlayError(null);
      }}
      onWaiting={() => {
        console.log("[LocalVideoPlayer] Video waiting for data");
      }}
      onPlay={() => setIsPlaying(true)}
      onPause={() => {
        setIsPlaying(false);
        if (videoRef.current && documentIdRef.current) {
          savePosition(videoRef.current.currentTime);
        }
      }}
      onTimeUpdate={() => {
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
        }
      }}
      onVolumeChange={() => {
        if (videoRef.current) {
          setVolume(videoRef.current.volume * 100);
          setIsMuted(videoRef.current.muted);
        }
      }}
      onError={(e) => {
        const error = videoRef.current?.error;
        let errorMessage = error
          ? `Error code ${error.code}: ${error.message}`
          : 'Unknown video error';
        let userFriendlyMessage = errorMessage;

        // Provide codec-specific guidance
        if (error?.code === 3) {
          // MEDIA_ERR_DECODE - codec not supported
          userFriendlyMessage = 'This video format is not supported by your browser. '
            + 'Please try converting the video to MP4 (H.264 codec). '
            + 'Common incompatible formats include HEVC/H.265, AV1, and some MKV files.';
        } else if (error?.code === 4) {
          // MEDIA_ERR_SRC_NOT_SUPPORTED
          userFriendlyMessage = 'The video file could not be loaded. It may be corrupted or in an unsupported format.';
        }

        console.error('[LocalVideoPlayer] Video error:', errorMessage, e);
        setPlayError(userFriendlyMessage);
        toast.error('Video Error', userFriendlyMessage);
      }}
      onWheel={handleScroll}
      onClick={handleVideoClick}
      onDoubleClick={handleVideoDoubleClick}
    />
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col rounded-lg overflow-hidden relative",
        mediaType === "audio" ? "bg-background" : "bg-black",
        className
      )}
    >
      {/* Media Element */}
      {mediaElement}

      {/* Error Display */}
      {playError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center p-6 max-w-md">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Playback Error</h3>
            <p className="text-sm text-gray-300 mb-4">{playError}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  setPlayError(null);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Retry
              </button>
              <button
                onClick={() => setPlayError(null)}
                className="mt-4 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:opacity-90"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll hint overlay - shows briefly when video loads */}
      <ScrollHint isPlaying={isPlaying} />

      {mediaType === "audio" && (
        <div className="flex-1 w-full flex items-center justify-center px-10 py-12">
          <div className="w-full max-w-5xl h-48 md:h-64">
            <div className="flex items-end gap-1 h-full">
              {waveformBars.map((height, index) => {
                const filled = (index / waveformBars.length) * 100 <= progressPercent;
                return (
                  <div
                    key={`wave-${index}`}
                    className={cn(
                      "flex-1 rounded-full transition-colors",
                      filled ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                    style={{ height: `${Math.max(8, Math.round(height * 100))}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-between opacity-0 hover:opacity-100 transition-opacity px-4 pt-4 pb-6 z-20 pointer-events-none hover:pointer-events-auto",
          mediaType === "audio"
            ? "bg-gradient-to-b from-background/80 via-transparent to-background/80"
            : "bg-gradient-to-b from-black/30 via-transparent to-black/50"
        )}
      >
        {/* Top Controls */}
        <div className="flex items-center justify-between">
          <div className={cn("text-sm truncate", mediaType === "audio" ? "text-foreground" : "text-white")}>
            {title || (mediaType === "audio" ? "Audio" : "Video")}
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Fullscreen (F)"
          >
            <Maximize className={cn("w-5 h-5", mediaType === "audio" ? "text-foreground" : "text-white")} />
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => seekRelative(-10)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Back 10s (←)"
          >
            <SkipBack className={cn("w-5 h-5", mediaType === "audio" ? "text-foreground" : "text-white")} />
          </button>

          <button
            onClick={() => seekRelative(-5)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Back 5s"
          >
            <SkipBack className={cn("w-5 h-5", mediaType === "audio" ? "text-foreground" : "text-white")} />
          </button>

          <button
            onClick={togglePlay}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Play/Pause (Space/K)"
          >
            {isPlaying ? (
              <Pause className={cn("w-6 h-6", mediaType === "audio" ? "text-foreground" : "text-white")} />
            ) : (
              <Play className={cn("w-6 h-6 ml-0.5", mediaType === "audio" ? "text-foreground" : "text-white")} />
            )}
          </button>

          <button
            onClick={() => seekRelative(5)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Forward 5s"
          >
            <SkipForward className={cn("w-5 h-5", mediaType === "audio" ? "text-foreground" : "text-white")} />
          </button>

          <button
            onClick={() => seekRelative(10)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Forward 10s"
          >
            <SkipForward className={cn("w-5 h-5", mediaType === "audio" ? "text-foreground" : "text-white")} />
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-2">
          {/* Progress Bar */}
          <div
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = ((e.clientX - rect.left) / rect.width) * 100;
              seekToPercentage(percent);
            }}
          >
            <div
              className="h-full bg-red-500 rounded-full relative transition-all"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Control Bar */}
          <div className={cn("flex items-center justify-between", mediaType === "audio" ? "text-foreground" : "text-white")}>
            {/* Left side - Time and playback speed */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button
                onClick={() => changePlaybackRate(playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : playbackRate === 1.5 ? 1.75 : playbackRate === 1.75 ? 2 : 1)}
                className="px-2 py-0.5 bg-white/10 rounded text-xs hover:bg-white/20 transition-colors"
                title="Speed"
              >
                {playbackRate}x
              </button>
            </div>

            {/* Right side - Volume and fullscreen */}
            <div className="flex items-center gap-2">
              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Mute (M)"
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
                  value={isMuted ? 0 : volume}
                  onChange={(e) => adjustVolume(parseInt(e.target.value))}
                  className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              {/* Rotation button */}
              <button
                onClick={toggleFullscreen}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Fullscreen (F)"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className={cn(
        "absolute top-4 right-4 p-2 rounded text-xs opacity-0 hover:opacity-100 transition-opacity z-30",
        mediaType === "audio" ? "bg-background/90 text-foreground border border-border" : "bg-black/70 text-white"
      )}>
        <div className="font-semibold mb-1">Shortcuts:</div>
        <div>Space/K: Play/Pause</div>
        <div>←/→: 5s</div>
        <div>↑/↓: Volume</div>
        <div>Scroll: Seek ±5s</div>
        <div>Click: Play/Pause</div>
        <div>Dbl Click: Fullscreen</div>
        <div>M: Mute</div>
        <div>F: Fullscreen</div>
        <div>0-9: Jump to %</div>
        <div>&lt;/&gt;: Speed</div>
      </div>
    </div>
  );
}

// Scroll hint component that shows briefly when video loads
function ScrollHint({ isPlaying }: { isPlaying: boolean }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2500);
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);
  
  if (!visible) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div 
        className={cn(
          "bg-black/60 text-white px-4 py-3 rounded-lg text-sm transition-opacity duration-500",
          fading && "opacity-0"
        )}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <div>
            <div className="font-medium">Scroll to seek</div>
            <div className="text-xs text-white/70">Scroll up/down to rewind/forward</div>
          </div>
        </div>
      </div>
    </div>
  );
}
