import { useState, useEffect, useRef, useMemo } from "react";
import { Clock, Search, Copy, Download, Play, CornerDownLeft } from "lucide-react";

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
  onSelectionChange?: (text: string) => void;
  className?: string;
  /**
   * Whether to show paragraph-level grouping for better readability
   */
  groupParagraphs?: boolean;
}

export function TranscriptSync({
  segments = [],
  currentTime,
  onSeek,
  autoScroll = true,
  showTimestamps = true,
  showSpeakers = true,
  onExport,
  onSelectionChange,
  className = "flex-1 min-h-0",
  groupParagraphs = true,
}: TranscriptSyncProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>(segments || []);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter segments based on search query
  useEffect(() => {
    const safeSegments = segments || [];
    if (!searchQuery.trim()) {
      setFilteredSegments(safeSegments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = safeSegments.filter((seg) =>
        seg.text.toLowerCase().includes(query)
      );
      setFilteredSegments(filtered);
    }
  }, [searchQuery, segments]);

  // Find active segment based on current time
  useEffect(() => {
    const safeSegments = segments || [];
    const index = safeSegments.findIndex(
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

  // Handle text selection
  const handleSelection = () => {
    if (!onSelectionChange) return;
    
    // Clear previous timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
    
    // Debounce selection to avoid spamming
    selectionTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        onSelectionChange(selection.toString().trim());
      }
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  // Group segments into paragraphs for better readability
  const groupedSegments = useMemo(() => {
    if (!groupParagraphs || segments.length === 0) return segments.map((seg, i) => ({ ...seg, groupIndex: i }));
    
    const groups: (TranscriptSegment & { groupIndex: number; isParagraphStart?: boolean })[] = [];
    let currentGroup: TranscriptSegment | null = null;
    let groupIndex = 0;
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const prevSeg = segments[i - 1];
      
      // Start a new paragraph if:
      // 1. This is the first segment
      // 2. There's a gap of more than 2 seconds
      // 3. The text ends with punctuation (sentence break)
      const isNewParagraph = !prevSeg || 
        (seg.start - prevSeg.end > 2) ||
        /[.!?]\s*$/.test(prevSeg.text);
      
      if (isNewParagraph) {
        groupIndex++;
        currentGroup = seg;
      }
      
      groups.push({ ...seg, groupIndex, isParagraphStart: isNewParagraph });
    }
    
    return groups;
  }, [segments, groupParagraphs]);

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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeIndex !== -1 && onSeek) {
      e.preventDefault();
      onSeek(segments[activeIndex].start);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Transcript
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {filteredSegments.length} segments
            </span>
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Copy transcript"
            >
              <Copy className="w-4 h-4" />
            </button>
            {onExport && (
              <button
                onClick={handleExport}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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
            onKeyDown={handleKeyDown}
            placeholder="Search transcript..."
            className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <CornerDownLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Transcript segments */}
      <div
        ref={containerRef}
        className={`${className} overflow-y-auto p-4 space-y-1`}
        data-transcript-scroll="true"
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
        tabIndex={0}
        role="listbox"
        aria-label="Video transcript"
      >
        {filteredSegments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <Search className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">No transcript segments found</p>
            {searchQuery && (
              <p className="text-xs mt-1 opacity-70">Try a different search term</p>
            )}
          </div>
        ) : (
          filteredSegments.map((segment, index) => {
            const segmentIndex = (segments || []).indexOf(segment);
            const isActive = segmentIndex === activeIndex;
            const isHighlighted = searchQuery && segment.text.toLowerCase().includes(searchQuery.toLowerCase());
            const isParagraphStart = (segment as any).isParagraphStart;

            return (
              <div
                key={segment.id}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => handleSegmentClick(segment)}
                className={`group relative rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-primary/15 border-l-4 border-l-primary border-y border-r border-primary/20 shadow-sm"
                    : isHighlighted
                    ? "bg-amber-500/10 border-l-4 border-l-amber-500 border-y border-r border-amber-500/20"
                    : "bg-transparent hover:bg-muted/40 border-l-4 border-l-transparent border-y border-r border-transparent"
                } ${isParagraphStart ? "mt-4 first:mt-0" : ""}`}
                role="option"
                aria-selected={isActive}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Timestamp with play button */}
                  {showTimestamps && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSegmentClick(segment);
                      }}
                      className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                      title={`Jump to ${formatTime(segment.start)}`}
                    >
                      {isActive ? (
                        <Play className="w-3 h-3 fill-current" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span className="tabular-nums">{formatTime(segment.start)}</span>
                    </button>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 leading-relaxed">
                    {/* Speaker */}
                    {showSpeakers && segment.speaker && (
                      <span className={`text-xs font-semibold mr-2 ${
                        isActive ? "text-primary" : "text-primary/80"
                      }`}>
                        {segment.speaker}
                      </span>
                    )}

                    {/* Text */}
                    <span className={`text-sm ${
                      isActive 
                        ? "text-foreground font-medium" 
                        : "text-foreground/90"
                    }`}>
                      {highlightText(segment.text, searchQuery)}
                    </span>
                  </div>
                </div>

                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer with stats */}
      <div className="flex-shrink-0 px-4 py-2.5 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {filteredSegments.length.toLocaleString()}
          </span>
          <span>segment{filteredSegments.length !== 1 ? "s" : ""}</span>
          {searchQuery && (
            <span className="text-primary">
              ({segments.length - filteredSegments.length} filtered)
            </span>
          )}
        </div>
        {activeIndex !== -1 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="tabular-nums font-medium text-foreground">
              {formatTime(currentTime)}
            </span>
          </div>
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

/**
 * Highlight search terms in text
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-500/30 text-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
