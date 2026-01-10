/**
 * YouTube Viewer Component
 * Displays YouTube videos with synchronized transcript
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Youtube, Clock, ExternalLink } from "lucide-react";
import { TranscriptSync, TranscriptSegment } from "../media/TranscriptSync";
import { invoke } from "@tauri-apps/api/core";
import { getYouTubeEmbedURL, getYouTubeWatchURL, formatDuration } from "../../api/youtube";

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

export function YouTubeViewer({ videoId, documentId, title, onLoad }: YouTubeViewerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [startTime] = useState(0);

  // Load transcript from backend - MUST be defined before initializePlayer
  const loadTranscript = useCallback(async () => {
    setIsLoadingTranscript(true);
    try {
      const transcriptData = await invoke<{
        segments: Array<{ text: string; start: number; duration: number }>;
      }>("get_youtube_transcript_by_id", { videoId });

      const segments: TranscriptSegment[] = transcriptData.segments.map((seg, i) => ({
        id: `seg-${i}`,
        start: seg.start,
        end: seg.start + seg.duration,
        text: seg.text,
      }));

      setTranscript(segments);
    } catch (error) {
      console.log("Transcript not available:", error);
      // Transcript is optional, don't show error to user
    } finally {
      setIsLoadingTranscript(false);
    }
  }, [videoId]);

  // Initialize player - defined after loadTranscript so it can be included in dependencies
  const initializePlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        start: startTime,
      },
      events: {
        onReady: (event: any) => {
          setIsReady(true);
          const playerDuration = event.target.getDuration() || 0;
          setDuration(playerDuration);
          onLoad?.({ duration: playerDuration, title: title || "" });

          // Load transcript
          loadTranscript();

          // Start time tracking
          intervalRef.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
              setCurrentTime(playerRef.current.getCurrentTime());
            }
          }, 500);
        },
        onStateChange: (event: any) => {
          const playerState = event.target.getPlayerState();
          setIsPlaying(playerState === window.YT.PlayerState.PLAYING);
        },
        onError: (event: any) => {
          console.error("YouTube player error:", event.data);
        },
      },
    });
  }, [videoId, startTime, title, onLoad, loadTranscript]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      initializePlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      initializePlayer();
    };

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [initializePlayer]);

  // Seek to time
  const handleSeek = useCallback((time: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  }, []);

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
