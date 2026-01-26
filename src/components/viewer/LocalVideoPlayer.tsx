/**
 * Local Video Player Component
 * Plays local video files with position tracking, playback speed, and keyboard shortcuts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { saveDocumentPosition, timePosition } from '../../api/position';
import { useToast } from '../common/Toast';

interface LocalVideoPlayerProps {
  src: string; // Local file URL or blob URL
  documentId?: string;
  title?: string;
  onLoad?: (metadata: { duration: number; title: string }) => void;
  className?: string;
}

export function LocalVideoPlayer({
  src,
  documentId,
  title,
  onLoad,
  className = '',
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Position tracking
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const lastSavedTimeRef = useRef(0);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const documentIdRef = useRef(documentId);

  // Update refs when values change
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  // Load saved position from document
  const loadSavedPosition = useCallback(async () => {
    if (!documentId) {
      setPositionLoaded(true);
      return;
    }

    try {
      const response = await fetch('/api/position/' + documentId);
      if (response.ok) {
        const data = await response.json();
        if (data.position && data.position.type === 'time') {
          const savedTime = data.position.seconds || 0;
          if (savedTime >= 3) {
            setStartTime(savedTime);
            if (videoRef.current) {
              videoRef.current.currentTime = savedTime;
            }
            console.log(`[VideoPlayer] Restored position: ${savedTime}s`);
          }
        }
      }
    } catch (error) {
      console.log('[VideoPlayer] Failed to load position:', error);
    } finally {
      setPositionLoaded(true);
    }
  }, [documentId]);

  // Save current position
  const savePosition = useCallback(async (time: number) => {
    const currentDocumentId = documentIdRef.current;
    if (!currentDocumentId) return;

    // Avoid saving if time hasn't changed significantly
    if (Math.abs(time - lastSavedTimeRef.current) < 1) {
      return;
    }

    try {
      await saveDocumentPosition(
        currentDocumentId,
        timePosition(Math.floor(time), duration)
      );
      lastSavedTimeRef.current = time;
    } catch (error) {
      console.log('[VideoPlayer] Failed to save position:', error);
    }
  }, [duration]);

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
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-black rounded-lg overflow-hidden ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-full bg-black"
        onLoadedMetadata={() => {
          if (videoRef.current) {
            const videoDuration = videoRef.current.duration;
            setDuration(videoDuration);
            onLoad?.({ duration: videoDuration, title: title || 'Video' });
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          // Save position when pausing
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
      />

      {/* Controls Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-b from-black/30 via-transparent to-black/50 p-4">
        {/* Top Controls */}
        <div className="flex items-center justify-between">
          <div className="text-white text-sm truncate">{title || 'Video'}</div>
          <button
            onClick={toggleFullscreen}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Fullscreen (F)"
          >
            <Maximize className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => seekRelative(-10)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Back 10s (←)"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={() => seekRelative(-5)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Back 5s"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={togglePlay}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Play/Pause (Space/K)"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => seekRelative(5)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Forward 5s"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={() => seekRelative(10)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Forward 10s"
          >
            <SkipForward className="w-5 h-5 text-white" />
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
          <div className="flex items-center justify-between text-white">
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
      <div className="absolute top-4 right-4 p-2 bg-black/70 rounded text-xs text-white opacity-0 hover:opacity-100 transition-opacity">
        <div className="font-semibold mb-1">Shortcuts:</div>
        <div>Space/K: Play/Pause</div>
        <div>←/→: 5s</div>
        <div>↑/↓: Volume</div>
        <div>M: Mute</div>
        <div>F: Fullscreen</div>
        <div>0-9: Jump to %</div>
        <div>&lt;/&gt;: Speed</div>
      </div>
    </div>
  );
}
