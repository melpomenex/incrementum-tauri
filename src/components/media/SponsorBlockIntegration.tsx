import { useState, useEffect, useCallback, useRef } from "react";
import {
  SkipForward,
  Eye,
  EyeOff,
  Info,
  ThumbsUp,
  ThumbsDown,
  Settings,
} from "lucide-react";
import {
  SponsorBlockSegment,
  fetchSponsorBlockSegments,
  extractVideoID,
  getCurrentSegment,
  shouldSkipTime,
  getNextSegmentTime,
  getCategoryDisplayName,
  getCategoryColor,
  formatSegmentTime,
  voteOnSegment,
  generateUserID,
} from "../../api/sponsorblock";

interface SponsorBlockIntegrationProps {
  videoUrl: string;
  currentTime: number;
  onSeek: (time: number) => void;
  onSkip?: (segment: SponsorBlockSegment) => void;
  autoSkip?: boolean;
  enabled?: boolean;
}

export function SponsorBlockIntegration({
  videoUrl,
  currentTime,
  onSeek,
  onSkip,
  autoSkip = true,
  enabled = true,
}: SponsorBlockIntegrationProps) {
  const [segments, setSegments] = useState<SponsorBlockSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<SponsorBlockSegment | null>(null);
  const [hasSkipped, setHasSkipped] = useState<Set<string>>(new Set());
  const [showNotice, setShowNotice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userID] = useState(() => {
    const stored = localStorage.getItem("sponsorblock_userid");
    if (stored) return stored;
    const newID = generateUserID();
    localStorage.setItem("sponsorblock_userid", newID);
    return newID;
  });

  // Skip notification timeout
  const skipNoticeTimeout = useRef<NodeJS.Timeout>();

  // Fetch segments when video URL changes
  useEffect(() => {
    if (!enabled) {
      setSegments([]);
      return;
    }

    const videoID = extractVideoID(videoUrl);
    if (!videoID || videoID.platform !== "youtube") {
      return;
    }

    const loadSegments = async () => {
      setIsLoading(true);
      const fetchedSegments = await fetchSponsorBlockSegments(videoID.videoID);
      setSegments(fetchedSegments);
      setIsLoading(false);
    };

    loadSegments();
  }, [videoUrl, enabled]);

  // Check current time for segments
  useEffect(() => {
    if (!enabled || segments.length === 0) {
      setCurrentSegment(null);
      return;
    }

    const segment = getCurrentSegment(segments, currentTime);
    setCurrentSegment(segment);

    // Auto-skip if enabled and we haven't skipped this segment yet
    if (
      autoSkip &&
      segment &&
      segment.actionType === "skip" &&
      !hasSkipped.has(segment.UUID)
    ) {
      const [start, end] = segment.segment;

      // Give a small buffer before skipping
      if (currentTime >= start + 0.1) {
        // Skip to end of segment
        onSeek(end);
        onSkip?.(segment);

        // Mark as skipped
        setHasSkipped((prev) => new Set(prev).add(segment.UUID));

        // Show skip notice
        setShowNotice(true);
        if (skipNoticeTimeout.current) {
          clearTimeout(skipNoticeTimeout.current);
        }
        skipNoticeTimeout.current = setTimeout(() => {
          setShowNotice(false);
        }, 2000);
      }
    }
  }, [currentTime, segments, enabled, autoSkip, hasSkipped, onSeek, onSkip]);

  // Skip to next segment
  const skipToNext = useCallback(() => {
    const nextTime = getNextSegmentTime(segments, currentTime);
    if (nextTime !== null) {
      onSeek(nextTime);
    }
  }, [segments, currentTime, onSeek]);

  // Vote on segment
  const handleVote = async (UUID: string, vote: number) => {
    await voteOnSegment(UUID, userID, vote);
  };

  // Don't render anything if not enabled or no segments
  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Skip Notice */}
      {showNotice && currentSegment && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <SkipForward className="w-4 h-4" />
          <span className="text-sm font-medium">
            Skipped: {getCategoryDisplayName(currentSegment.category)}
          </span>
        </div>
      )}

      {/* Segment Indicator (when in a segment) */}
      {currentSegment && !autoSkip && (
        <div className="absolute top-4 right-4 z-50 px-3 py-2 bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(currentSegment.category)}`}>
              {getCategoryDisplayName(currentSegment.category)}
            </div>
            <button
              onClick={() => {
                const [, end] = currentSegment.segment;
                onSeek(end);
              }}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Skip this segment"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Segments Timeline / List */}
      {segments.length > 0 && (
        <div className="absolute bottom-20 left-4 right-4 z-40">
          <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkipForward className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  SponsorBlock ({segments.length} segment{segments.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={skipToNext}
                  className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                  title="Skip to next segment"
                >
                  Skip Next
                </button>
              </div>
            </div>

            {/* Segments List */}
            <div className="max-h-48 overflow-y-auto">
              {segments.map((segment, index) => {
                const [start, end] = segment.segment;
                const isActive = currentSegment?.UUID === segment.UUID;
                const duration = end - start;

                return (
                  <div
                    key={segment.UUID}
                    className={`px-4 py-2 border-b border-border last:border-b-0 flex items-center gap-3 ${
                      isActive ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    {/* Category Badge */}
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(segment.category)}`}>
                      {getCategoryDisplayName(segment.category)}
                    </div>

                    {/* Time */}
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatSegmentTime(start)} → {formatSegmentTime(end)}
                      <span className="ml-1 opacity-70">({duration.toFixed(1)}s)</span>
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-auto">
                      {isActive ? (
                        <button
                          onClick={() => onSeek(end)}
                          className="p-1 text-primary hover:bg-primary/20 rounded transition-colors"
                          title="Skip now"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onSeek(start)}
                          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          title="Jump to segment"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleVote(segment.UUID, 1)}
                        className="p-1 text-muted-foreground hover:text-green-500 hover:bg-muted rounded transition-colors"
                        title="Upvote"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleVote(segment.UUID, 0)}
                        className="p-1 text-muted-foreground hover:text-red-500 hover:bg-muted rounded transition-colors"
                        title="Downvote"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="px-4 py-3 border-t border-border bg-muted/30 space-y-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={autoSkip}
                    onChange={(e) => {
                      // In a real app, this would update settings
                      console.log("Auto-skip:", e.target.checked);
                    }}
                    className="rounded"
                  />
                  <span>Auto-skip sponsored segments</span>
                </label>
                <div className="text-xs text-muted-foreground">
                  User ID: {userID.slice(0, 8)}...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-50 px-3 py-2 bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading SponsorBlock...</span>
        </div>
      )}
    </>
  );
}

/**
 * Hook to use SponsorBlock in video players
 */
export function useSponsorBlock(videoUrl: string, autoSkip = true) {
  const [segments, setSegments] = useState<SponsorBlockSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setSegments([]);
      return;
    }

    const videoID = extractVideoID(videoUrl);
    if (!videoID || videoID.platform !== "youtube") {
      setSegments([]);
      return;
    }

    const loadSegments = async () => {
      setIsLoading(true);
      const fetchedSegments = await fetchSponsorBlockSegments(videoID.videoID);
      setSegments(fetchedSegments);
      setIsLoading(false);
    };

    loadSegments();
  }, [videoUrl, enabled]);

  const checkTime = useCallback(
    (time: number): { shouldSkip: boolean; segment: SponsorBlockSegment | null } => {
      const segment = getCurrentSegment(segments, time);
      return {
        shouldSkip: autoSkip && segment !== null && segment.actionType === "skip",
        segment,
      };
    },
    [segments, autoSkip]
  );

  return {
    segments,
    isLoading,
    enabled,
    setEnabled,
    checkTime,
  };
}
