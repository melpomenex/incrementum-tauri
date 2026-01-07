import { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  List,
} from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onLoad?: () => void;
  playlist?: Array<{
    src: string;
    title: string;
    artist?: string;
  }>;
  onTrackChange?: (index: number) => void;
}

export function AudioPlayer({
  src,
  title,
  artist,
  album,
  artwork,
  onTimeUpdate,
  onEnded,
  onLoad,
  playlist,
  onTrackChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [repeatMode, setRepeatMode] = useState<"none" | "all" | "one">("none");

  // Playlist state
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Visualizer
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [animationId, setAnimationId] = useState<number | null>(null);

  // Initialize audio context for visualizer
  useEffect(() => {
    if (isPlaying && audioRef.current && !audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      setAudioContext(ctx);
      setAnalyser(analyserNode);
    }

    return () => {
      if (audioContext) {
        audioContext.close();
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying]);

  // Visualizer animation
  useEffect(() => {
    if (analyser && canvasRef.current && isPlaying) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyser || !canvas) return;

        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = "rgba(0, 0, 0, 0)";
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barX = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          // Create gradient based on position
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, "hsl(250, 70%, 50%)");
          gradient.addColorStop(0.5, "hsl(280, 70%, 50%)");
          gradient.addColorStop(1, "hsl(320, 70%, 50%)");

          ctx.fillStyle = gradient;
          ctx.fillRect(barX, canvas.height - barHeight, barWidth, barHeight);

          barX += barWidth + 1;
        }

        const id = requestAnimationFrame(draw);
        setAnimationId(id);
      };

      draw();
    } else if (animationId && !isPlaying) {
      cancelAnimationFrame(animationId);
      setAnimationId(null);
    }
  }, [analyser, isPlaying]);

  // Update time
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time, duration);
    }
  };

  // Toggle play/pause
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

  // Skip forward/backward
  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(duration, audioRef.current.currentTime + seconds)
      );
    }
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Cycle repeat mode
  const cycleRepeatMode = () => {
    const modes: Array<"none" | "all" | "one"> = ["none", "all", "one"];
    const currentModeIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Format time
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Playback rate
  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Handle track change from playlist
  const handleTrackChange = (index: number) => {
    setCurrentTrackIndex(index);
    onTrackChange?.(index);
  };

  // Next/previous track
  const nextTrack = () => {
    if (playlist && currentTrackIndex < playlist.length - 1) {
      handleTrackChange(currentTrackIndex + 1);
    } else if (repeatMode === "all" && playlist) {
      handleTrackChange(0);
    }
  };

  const previousTrack = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (currentTrackIndex > 0) {
      handleTrackChange(currentTrackIndex - 1);
    } else if (repeatMode === "all" && playlist) {
      handleTrackChange(playlist.length - 1);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
          skip(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowDown":
          e.preventDefault();
          skip(10);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "r":
          e.preventDefault();
          cycleRepeatMode();
          break;
        case "n":
          e.preventDefault();
          nextTrack();
          break;
        case "p":
          e.preventDefault();
          previousTrack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying, duration, isMuted, repeatMode, currentTrackIndex]);

  // Audio loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      onLoad?.();
    }
  };

  // Handle ended
  const handleEnded = () => {
    onEnded?.();
    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  };

  // Get current track info
  const currentTrack = playlist ? playlist[currentTrackIndex] : { src, title, artist };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
      />

      {/* Main Player */}
      <div className="p-6">
        {/* Album Art and Track Info */}
        <div className="flex items-center gap-6 mb-6">
          {artwork && (
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={artwork}
                alt={currentTrack.title || "Album art"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-foreground truncate">
              {currentTrack.title || "Unknown Track"}
            </h3>
            {currentTrack.artist && (
              <p className="text-muted-foreground truncate">{currentTrack.artist}</p>
            )}
            {album && <p className="text-sm text-muted-foreground truncate">{album}</p>}
          </div>

          {/* Visualizer */}
          <div className="flex-shrink-0">
            <canvas
              ref={canvasRef}
              width={200}
              height={50}
              className="bg-background rounded border border-border"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            {/* Shuffle/Repeat */}
            {playlist && playlist.length > 1 && (
              <button
                onClick={cycleRepeatMode}
                className={`p-2 hover:bg-muted rounded-lg transition-colors ${
                  repeatMode !== "none" ? "text-primary" : "text-muted-foreground"
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Previous Track */}
            {playlist && playlist.length > 1 && (
              <button
                onClick={previousTrack}
                className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                title="Previous track (P)"
              >
                <SkipBack className="w-5 h-5" />
              </button>
            )}

            {/* Skip Back */}
            <button
              onClick={() => skip(-15)}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              title="Skip back 15s"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-4 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              title="Play/Pause (Space)"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(15)}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              title="Skip forward 15s"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Next Track */}
            {playlist && playlist.length > 1 && (
              <button
                onClick={nextTrack}
                className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                title="Next track (N)"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
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
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
              />
            </div>

            {/* Playback Rate */}
            <button
              onClick={cyclePlaybackRate}
              className="px-3 py-1 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              title="Playback speed"
            >
              {playbackRate}x
            </button>

            {/* Playlist Toggle */}
            {playlist && playlist.length > 1 && (
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className={`p-2 rounded-lg transition-colors ${
                  showPlaylist ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
                title="Playlist"
              >
                <List className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Playlist */}
      {showPlaylist && playlist && playlist.length > 1 && (
        <div className="border-t border-border">
          <div className="max-h-64 overflow-y-auto">
            {playlist.map((track, index) => (
              <button
                key={index}
                onClick={() => handleTrackChange(index)}
                className={`w-full px-6 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 ${
                  index === currentTrackIndex ? "bg-muted/50" : ""
                }`}
              >
                {index === currentTrackIndex && isPlaying ? (
                  <Pause className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <span className="w-4 text-center text-muted-foreground flex-shrink-0 text-sm">
                    {index + 1}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{track.title}</p>
                  {track.artist && (
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
