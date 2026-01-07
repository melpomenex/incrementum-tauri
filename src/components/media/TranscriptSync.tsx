import { useState, useEffect, useRef } from "react";
import { Clock, Search, Copy, Download } from "lucide-react";

/**
 * Transcript segment
 */
export interface TranscriptSegment {
  id: string;
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string;
  speaker?: string;
}

interface TranscriptSyncProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek?: (time: number) => void;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  showSpeakers?: boolean;
  onExport?: () => void;
}

export function TranscriptSync({
  segments,
  currentTime,
  onSeek,
  autoScroll = true,
  showTimestamps = true,
  showSpeakers = true,
  onExport,
}: TranscriptSyncProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>(segments);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Filter segments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSegments(segments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = segments.filter((seg) =>
        seg.text.toLowerCase().includes(query)
      );
      setFilteredSegments(filtered);
    }
  }, [searchQuery, segments]);

  // Find active segment based on current time
  useEffect(() => {
    const index = segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);

      // Auto-scroll to active segment
      if (autoScroll && activeSegmentRef.current && containerRef.current) {
        activeSegmentRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentTime, segments, activeIndex, autoScroll]);

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

  // Handle segment click
  const handleSegmentClick = (segment: TranscriptSegment) => {
    onSeek?.(segment.start);
  };

  // Copy transcript text
  const handleCopy = () => {
    const text = segments
      .map((seg) => {
        const timestamp = `[${formatTime(seg.start)}]`;
        const speaker = seg.speaker ? `${seg.speaker}: ` : "";
        return `${timestamp} ${speaker}${seg.text}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  // Export transcript
  const handleExport = () => {
    onExport?.();
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">Transcript</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              title="Copy transcript"
            >
              <Copy className="w-4 h-4" />
            </button>
            {onExport && (
              <button
                onClick={handleExport}
                className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                title="Export transcript"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Transcript segments */}
      <div
        ref={containerRef}
        className="h-[400px] overflow-y-auto p-4 space-y-2"
      >
        {filteredSegments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No transcript segments found
          </div>
        ) : (
          filteredSegments.map((segment, index) => {
            const isActive = segments.indexOf(segment) === activeIndex;
            const isHighlighted = searchQuery && segment.text.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <div
                key={segment.id}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => handleSegmentClick(segment)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? "bg-primary/20 border border-primary/50"
                    : isHighlighted
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 border border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Timestamp */}
                  {showTimestamps && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSegmentClick(segment);
                      }}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      title="Jump to timestamp"
                    >
                      <Clock className="w-3 h-3" />
                      {formatTime(segment.start)}
                    </button>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Speaker */}
                    {showSpeakers && segment.speaker && (
                      <span className="text-xs font-medium text-primary mr-2">
                        {segment.speaker}:
                      </span>
                    )}

                    {/* Text */}
                    <span className="text-sm text-foreground">{segment.text}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {filteredSegments.length} segment{filteredSegments.length !== 1 ? "s" : ""}
        </span>
        {activeIndex !== -1 && (
          <span>
            Currently at: {formatTime(currentTime)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Parse SRT format
 */
export function parseSRT(srtContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const blocks = srtContent.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    const id = lines[0].trim();
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);

    if (!timeMatch) continue;

    const start = parseSRTTime(timeMatch[1]);
    const end = parseSRTTime(timeMatch[2]);
    const text = lines.slice(2).join("\n").replace(/<[^>]+>/g, ""); // Remove HTML tags

    segments.push({
      id,
      start,
      end,
      text,
    });
  }

  return segments;
}

/**
 * Parse SRT timestamp to seconds
 */
function parseSRTTime(time: string): number {
  const [timePart, msPart] = time.split(",");
  const [hours, minutes, seconds] = timePart.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(msPart) / 1000;
}

/**
 * Parse WebVTT format
 */
export function parseWebVTT(vttContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const lines = vttContent.split("\n");

  let i = 0;
  while (i < lines.length) {
    // Skip header and empty lines
    if (lines[i].includes("WEBVTT") || !lines[i].trim()) {
      i++;
      continue;
    }

    // Look for timestamp line
    const timeMatch = lines[i].match(
      /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
    );

    if (!timeMatch) {
      i++;
      continue;
    }

    const start = parseVTTTime(timeMatch[1]);
    const end = parseVTTTime(timeMatch[2]);
    const id = `cue-${i}`;

    // Collect text lines
    i++;
    let text = "";
    while (i < lines.length && lines[i].trim() && !lines[i].includes("-->")) {
      text += (text ? "\n" : "") + lines[i];
      i++;
    }

    segments.push({
      id,
      start,
      end,
      text: text.replace(/<[^>]+>/g, ""), // Remove HTML tags
    });
  }

  return segments;
}

/**
 * Parse VTT timestamp to seconds
 */
function parseVTTTime(time: string): number {
  const parts = time.split(":");
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  const [minutes, seconds] = parts.map(Number);
  return minutes * 60 + seconds;
}

/**
 * Export transcript to SRT format
 */
export function exportToSRT(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, index) => {
      const startTime = formatSRTTime(seg.start);
      const endTime = formatSRTTime(seg.end);
      const speaker = seg.speaker ? `<v ${seg.speaker}>` : "";
      return `${index + 1}\n${startTime} --> ${endTime}\n${speaker}${seg.text}\n`;
    })
    .join("\n");
}

/**
 * Format time to SRT timestamp
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Export transcript to plain text
 */
export function exportToPlainText(segments: TranscriptSegment[]): string {
  return segments
    .map((seg) => {
      const timestamp = `[${formatSRTTime(seg.start)}]`;
      const speaker = seg.speaker ? `${seg.speaker}: ` : "";
      return `${timestamp} ${speaker}${seg.text}`;
    })
    .join("\n");
}
