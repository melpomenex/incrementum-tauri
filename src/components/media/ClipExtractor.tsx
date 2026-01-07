import { useState, useRef, useEffect } from "react";
import {
  Scissors,
  Play,
  Pause,
  Download,
  Trash2,
  Plus,
  Film,
  Volume2,
} from "lucide-react";

interface ClipRange {
  id: string;
  start: number;
  end: number;
  name: string;
}

interface ClipExtractorProps {
  src: string;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  type?: "video" | "audio";
  onExtract?: (clip: ClipRange) => void;
}

export function ClipExtractor({
  src,
  duration,
  currentTime,
  onSeek,
  type = "video",
  onExtract,
}: ClipExtractorProps) {
  const [clips, setClips] = useState<ClipRange[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);
  const [newClipStart, setNewClipStart] = useState<number | null>(null);
  const [isSettingStart, setIsSettingStart] = useState(true);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

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

  // Set clip start point
  const setClipStart = () => {
    setNewClipStart(currentTime);
    setIsSettingStart(false);
  };

  // Set clip end point and create clip
  const setClipEnd = () => {
    if (newClipStart === null) return;

    const newClip: ClipRange = {
      id: `clip-${Date.now()}`,
      start: Math.min(newClipStart, currentTime),
      end: Math.max(newClipStart, currentTime),
      name: `Clip ${clips.length + 1}`,
    };

    setClips([...clips, newClip]);
    setNewClipStart(null);
    setIsSettingStart(true);
  };

  // Cancel current clip creation
  const cancelClip = () => {
    setNewClipStart(null);
    setIsSettingStart(true);
  };

  // Delete clip
  const deleteClip = (id: string) => {
    setClips(clips.filter((clip) => clip.id !== id));
  };

  // Rename clip
  const renameClip = (id: string, name: string) => {
    setClips(
      clips.map((clip) =>
        clip.id === id ? { ...clip, name } : clip
      )
    );
  };

  // Preview clip
  const previewClip = (clip: ClipRange) => {
    setPreviewClipId(clip.id);
    setIsPreviewing(true);
    onSeek(clip.start);
  };

  // End preview
  const endPreview = () => {
    setIsPreviewing(false);
    setPreviewClipId(null);
  };

  // Handle preview playback end
  useEffect(() => {
    if (!isPreviewing || !previewClipId) return;

    const clip = clips.find((c) => c.id === previewClipId);
    if (!clip) return;

    if (currentTime >= clip.end) {
      endPreview();
    }
  }, [currentTime, isPreviewing, previewClipId, clips]);

  // Extract clip (triggers download in real implementation)
  const extractClip = async (clip: ClipRange) => {
    // In a browser-only environment, we can use MediaRecorder API
    // For actual video extraction, backend processing would be needed
    onExtract?.(clip);

    // Show alert for now - in production this would trigger backend processing
    alert(
      `Extracting clip: "${clip.name}"\n` +
      `From: ${formatTime(clip.start)}\n` +
      `To: ${formatTime(clip.end)}\n\n` +
      `Note: Full clip extraction requires backend processing. ` +
      `This feature will be available with the media processing service.`
    );
  };

  // Extract all clips
  const extractAllClips = () => {
    clips.forEach((clip) => extractClip(clip));
  };

  // Join clips into one
  const joinClips = () => {
    if (clips.length < 2) return;

    const sorted = [...clips].sort((a, b) => a.start - b.start);
    const joined: ClipRange = {
      id: `clip-${Date.now()}`,
      start: sorted[0].start,
      end: sorted[sorted.length - 1].end,
      name: `Joined Clip (${clips.length} segments)`,
    };

    alert(
      `Joining ${clips.length} clips:\n` +
      `From: ${formatTime(joined.start)}\n` +
      `To: ${formatTime(joined.end)}\n\n` +
      `Note: Clip joining requires backend processing.`
    );
  };

  // Calculate total duration of all clips
  const totalDuration = clips.reduce(
    (acc, clip) => acc + (clip.end - clip.start),
    0
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === "video" ? (
              <Film className="w-5 h-5 text-foreground" />
            ) : (
              <Volume2 className="w-5 h-5 text-foreground" />
            )}
            <h3 className="text-lg font-semibold text-foreground">Clip Extractor</h3>
          </div>
          {clips.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {clips.length} clip{clips.length !== 1 ? "s" : ""} ·{" "}
              {formatTime(totalDuration)} total
            </div>
          )}
        </div>
      </div>

      {/* Timeline with clip markers */}
      <div className="p-4 bg-muted/20">
        <div className="relative">
          {/* Timeline track */}
          <div className="h-8 bg-muted rounded-full overflow-hidden">
            {/* Clip regions */}
            {clips.map((clip) => {
              const left = (clip.start / duration) * 100;
              const width = ((clip.end - clip.start) / duration) * 100;

              return (
                <div
                  key={clip.id}
                  className="absolute top-0 h-full bg-primary/60 hover:bg-primary/80 transition-colors cursor-pointer rounded"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => onSeek(clip.start)}
                  title={`${clip.name}: ${formatTime(clip.start)} - ${formatTime(clip.end)}`}
                />
              );
            })}

            {/* New clip being created */}
            {newClipStart !== null && (
              <>
                <div
                  className="absolute top-0 h-full bg-green-500/40"
                  style={{
                    left: `${(Math.min(newClipStart, currentTime) / duration) * 100}%`,
                    width: `${(Math.abs(currentTime - newClipStart) / duration) * 100}%`,
                  }}
                />
                <div
                  className="absolute top-0 w-0.5 h-full bg-green-500"
                  style={{ left: `${(newClipStart / duration) * 100}%` }}
                />
              </>
            )}

            {/* Current position */}
            <div
              className="absolute top-0 w-0.5 h-full bg-red-500"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Time labels */}
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {isSettingStart ? (
            <button
              onClick={setClipStart}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Set Start Point ({formatTime(currentTime)})
            </button>
          ) : (
            <>
              <button
                onClick={setClipEnd}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Set End Point ({formatTime(currentTime)})
              </button>
              <button
                onClick={cancelClip}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/70 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {newClipStart !== null && (
          <div className="mt-2 text-sm text-center text-muted-foreground">
            Selection: {formatTime(Math.min(newClipStart, currentTime))} →{" "}
            {formatTime(Math.max(newClipStart, currentTime))} (
            {formatTime(Math.abs(currentTime - newClipStart))})
          </div>
        )}
      </div>

      {/* Clips List */}
      <div className="p-4 max-h-64 overflow-y-auto">
        {clips.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Scissors className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No clips yet</p>
            <p className="text-sm">
              Set start and end points to create clips
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className={`p-3 bg-muted/30 rounded-lg border ${
                  isPreviewing && previewClipId === clip.id
                    ? "border-primary"
                    : "border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Clip info */}
                  <input
                    type="text"
                    value={clip.name}
                    onChange={(e) => renameClip(clip.id, e.target.value)}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  {/* Duration */}
                  <div className="text-xs text-muted-foreground font-mono">
                    {formatTime(clip.start)} → {formatTime(clip.end)} (
                    {formatTime(clip.end - clip.start)})
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isPreviewing && previewClipId === clip.id ? (
                      <button
                        onClick={endPreview}
                        className="p-1.5 text-primary hover:bg-primary/20 rounded transition-colors"
                        title="Stop preview"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => previewClip(clip)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Preview clip"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => extractClip(clip)}
                      className="p-1.5 text-green-500 hover:bg-green-500/20 rounded transition-colors"
                      title="Extract clip"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteClip(clip.id)}
                      className="p-1.5 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                      title="Delete clip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {clips.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <button
              onClick={extractAllClips}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Extract All Clips
            </button>
            {clips.length > 1 && (
              <button
                onClick={joinClips}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Scissors className="w-4 h-4" />
                Join Clips
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to generate clip filename
 */
export function generateClipFilename(
  baseName: string,
  clip: ClipRange,
  extension: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${baseName}_clip_${clip.start.toFixed(0)}-${clip.end.toFixed(0)}_${timestamp}.${extension}`;
}

/**
 * Helper to validate clip range
 */
export function validateClipRange(
  start: number,
  end: number,
  duration: number
): { valid: boolean; error?: string } {
  if (start < 0) {
    return { valid: false, error: "Start time cannot be negative" };
  }
  if (end > duration) {
    return { valid: false, error: "End time exceeds video duration" };
  }
  if (start >= end) {
    return { valid: false, error: "Start time must be before end time" };
  }
  if (end - start < 0.5) {
    return { valid: false, error: "Clip must be at least 0.5 seconds" };
  }
  return { valid: true };
}

export type { ClipRange };
