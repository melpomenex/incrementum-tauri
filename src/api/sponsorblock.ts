/**
 * SponsorBlock API integration
 * Documentation: https://wiki.sponsor.ajay.app/w/API_Docs
 */

/**
 * SponsorBlock segment categories
 */
export type SponsorBlockCategory =
  | "sponsor"
  | "intro"
  | "outro"
  | "selfpromo"
  | "interaction"
  | "music_offtopic"
  | "preview";

/**
 * SponsorBlock segment
 */
export interface SponsorBlockSegment {
  category: SponsorBlockCategory;
  actionType: "skip" | "mute" | "full";
  segment: [number, number]; // [startTime, endTime] in seconds
  UUID: string;
  locked: number;
  votes: number;
  description?: string;
}

/**
 * Video ID extraction result
 */
export interface VideoIDResult {
  videoID: string;
  platform: "youtube" | "vimeo" | "other";
}

/**
 * SponsorBlock API response
 */
interface SponsorBlockResponse {
  sponsorTimes: Array<[number, number]>;
  UUID: string[];
  category: SponsorBlockCategory[];
  actionType: string[];
}

/**
 * SponsorBlock API base URL
 */
const SPONSORBLOCK_API = "https://sponsor.ajay.app/api";

/**
 * Extract video ID from various URL formats
 */
export function extractVideoID(url: string): VideoIDResult | null {
  // YouTube URLs
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { videoID: match[1], platform: "youtube" };
    }
  }

  // Vimeo URLs
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { videoID: vimeoMatch[1], platform: "vimeo" };
  }

  return null;
}

/**
 * Fetch SponsorBlock segments for a video
 */
export async function fetchSponsorBlockSegments(
  videoID: string,
  categories: SponsorBlockCategory[] = ["sponsor", "intro", "outro", "selfpromo", "interaction"]
): Promise<SponsorBlockSegment[]> {
  try {
    const categoriesParam = categories.join(",");
    const response = await fetch(
      `${SPONSORBLOCK_API}/skipSegments/${videoID}?categories=${encodeURIComponent(
        categoriesParam
      )}&actionTypes=skip,mute`
    );

    if (!response.ok) {
      return [];
    }

    const data: SponsorBlockResponse[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Transform response into our format
    const segments: SponsorBlockSegment[] = [];
    const responseData = data[0];

    if (responseData && responseData.sponsorTimes) {
      for (let i = 0; i < responseData.sponsorTimes.length; i++) {
        segments.push({
          category: responseData.category[i] || "sponsor",
          actionType: (responseData.actionType[i] as "skip" | "mute" | "full") || "skip",
          segment: responseData.sponsorTimes[i],
          UUID: responseData.UUID?.[i] || "",
          locked: 0,
          votes: 0,
        });
      }
    }

    return segments;
  } catch (error) {
    console.error("Failed to fetch SponsorBlock segments:", error);
    return [];
  }
}

/**
 * Get the current segment at a given time
 */
export function getCurrentSegment(
  segments: SponsorBlockSegment[],
  currentTime: number
): SponsorBlockSegment | null {
  for (const segment of segments) {
    const [start, end] = segment.segment;
    if (currentTime >= start && currentTime < end) {
      return segment;
    }
  }
  return null;
}

/**
 * Get next segment start time
 */
export function getNextSegmentTime(
  segments: SponsorBlockSegment[],
  currentTime: number
): number | null {
  for (const segment of segments) {
    const [start] = segment.segment;
    if (start > currentTime) {
      return start;
    }
  }
  return null;
}

/**
 * Check if a time should be skipped
 */
export function shouldSkipTime(
  segments: SponsorBlockSegment[],
  currentTime: number
): boolean {
  const segment = getCurrentSegment(segments, currentTime);
  return segment !== null && segment.actionType === "skip";
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: SponsorBlockCategory): string {
  const names: Record<SponsorBlockCategory, string> = {
    sponsor: "Sponsor",
    intro: "Intro",
    outro: "Outro",
    selfpromo: "Self-promotion",
    interaction: "Interaction reminder",
    music_offtopic: "Non-music section",
    preview: "Preview/Recap",
  };
  return names[category] || category;
}

/**
 * Get category color for UI
 */
export function getCategoryColor(category: SponsorBlockCategory): string {
  const colors: Record<SponsorBlockCategory, string> = {
    sponsor: "bg-red-500/20 border-red-500/50 text-red-500",
    intro: "bg-blue-500/20 border-blue-500/50 text-blue-500",
    outro: "bg-purple-500/20 border-purple-500/50 text-purple-500",
    selfpromo: "bg-orange-500/20 border-orange-500/50 text-orange-500",
    interaction: "bg-pink-500/20 border-pink-500/50 text-pink-500",
    music_offtopic: "bg-green-500/20 border-green-500/50 text-green-500",
    preview: "bg-yellow-500/20 border-yellow-500/50 text-yellow-500",
  };
  return colors[category] || "bg-gray-500/20 border-gray-500/50 text-gray-500";
}

/**
 * Submit a segment to SponsorBlock (requires user authorization)
 */
export async function submitSegment(
  videoID: string,
  startTime: number,
  endTime: number,
  category: SponsorBlockCategory,
  userID: string,
  userAgent: string = "Incrementum/1.0"
): Promise<boolean> {
  try {
    const response = await fetch(`${SPONSORBLOCK_API}/api/skipSegments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoID,
        startTime,
        endTime,
        category,
        userID,
        userAgent,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to submit segment:", error);
    return false;
  }
}

/**
 * Vote on a segment
 */
export async function voteOnSegment(
  UUID: string,
  userID: string,
  vote: number // 0 = downvote, 1 = upvote
): Promise<boolean> {
  try {
    const response = await fetch(`${SPONSORBLOCK_API}/api/voteOnSponsorTime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        UUID,
        userID,
        type: vote,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to vote on segment:", error);
    return false;
  }
}

/**
 * Get user ID (stored locally for privacy)
 */
export function generateUserID(): string {
  // Generate a random UUID-like string
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format segment time for display
 */
export function formatSegmentTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
