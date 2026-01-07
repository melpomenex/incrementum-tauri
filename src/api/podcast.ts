/**
 * Podcast/RSS feed parsing and management
 */

/**
 * Podcast episode
 */
export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  duration?: number; // in seconds
  audioUrl: string;
  audioType?: string;
  fileSize?: number;
  imageUrl?: string;
  link?: string;
  guid?: string;
  played: boolean;
  position?: number; // playback position in seconds
}

/**
 * Podcast feed/channel
 */
export interface PodcastFeed {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  language?: string;
  author?: string;
  categories: string[];
  link: string;
  feedUrl: string;
  episodes: PodcastEpisode[];
  lastUpdated: string;
  subscribeDate: string;
}

/**
 * Parse RSS feed to podcast data
 */
export async function parsePodcastFeed(feedUrl: string): Promise<PodcastFeed | null> {
  try {
    // Use a CORS proxy for browser requests
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return parsePodcastXML(xmlText, feedUrl);
  } catch (error) {
    console.error("Failed to parse podcast feed:", error);
    return null;
  }
}

/**
 * Parse podcast XML data
 */
export function parsePodcastXML(xmlText: string, feedUrl: string): PodcastFeed | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  // Check for parsing errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    console.error("XML parsing error:", parseError.textContent);
    return null;
  }

  // Try iTunes namespace first, then standard RSS
  const channel = xmlDoc.querySelector("channel");
  if (!channel) {
    console.error("No channel element found in feed");
    return null;
  }

  // Extract channel data
  const title = getElementText(channel, "title") || "Unknown Podcast";
  const description =
    getElementText(channel, "itunes:summary") ||
    getElementText(channel, "description") ||
    "";
  const imageUrl =
    getAttributeText(channel.querySelector("itunes:image"), "href") ||
    getElementText(channel, "itunes:image") ||
    getElementText(channel, "image > url") ||
    "";
  const language = getElementText(channel, "language");
  const author =
    getElementText(channel, "itunes:author") ||
    getElementText(channel, "managingEditor") ||
    "";
  const link = getElementText(channel, "link") || feedUrl;

  // Extract categories
  const categories: string[] = [];
  channel.querySelectorAll("itunes\\:category, category").forEach((cat) => {
    const catText = cat.getAttribute("text") || cat.textContent;
    if (catText) {
      categories.push(catText);
    }
  });

  // Extract episodes
  const episodes: PodcastEpisode[] = [];
  const items = channel.querySelectorAll("item");

  items.forEach((item, index) => {
    const enclosure = item.querySelector("enclosure");
    if (!enclosure) return;

    const audioUrl = enclosure.getAttribute("url") || "";
    if (!audioUrl) return;

    const episode: PodcastEpisode = {
      id: getElementText(item, "guid") || `${feedUrl}-${index}`,
      title: getElementText(item, "title") || `Episode ${index + 1}`,
      description:
        getElementText(item, "itunes:summary") ||
        getElementText(item, "description") ||
        "",
      pubDate: getElementText(item, "pubDate") || "",
      audioUrl,
      audioType: enclosure.getAttribute("type") || "audio/mpeg",
      fileSize: parseInt(enclosure.getAttribute("length") || "0") || undefined,
      imageUrl:
        getAttributeText(item.querySelector("itunes:image"), "href") ||
        getElementText(item, "itunes:image") ||
        imageUrl,
      link: getElementText(item, "link"),
      guid: getElementText(item, "guid"),
      played: false,
      position: undefined,
    };

    // Parse duration if present (iTunes format)
    const durationText = getElementText(item, "itunes:duration");
    if (durationText) {
      episode.duration = parseITunesDuration(durationText);
    }

    episodes.push(episode);
  });

  return {
    id: generateFeedId(feedUrl),
    title,
    description,
    imageUrl,
    language,
    author,
    categories,
    link,
    feedUrl,
    episodes,
    lastUpdated: new Date().toISOString(),
    subscribeDate: new Date().toISOString(),
  };
}

/**
 * Helper to get element text content
 */
function getElementText(parent: Element | null, selector: string): string | null {
  if (!parent) return null;
  const element = parent.querySelector(selector);
  return element?.textContent?.trim() || null;
}

/**
 * Helper to get attribute text
 */
function getAttributeText(element: Element | null, attr: string): string | null {
  return element?.getAttribute(attr) || null;
}

/**
 * Parse iTunes duration format (HH:MM:SS or MM:SS or seconds)
 */
function parseITunesDuration(duration: string): number {
  const parts = duration.split(":").map(Number);

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else {
    // Seconds
    return parseInt(duration) || 0;
  }
}

/**
 * Format duration to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

/**
 * Generate feed ID from URL
 */
function generateFeedId(feedUrl: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < feedUrl.length; i++) {
    const char = feedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `podcast-${Math.abs(hash)}`;
}

/**
 * Subscribe to podcast (save to local storage)
 */
export function subscribeToPodcast(feed: PodcastFeed): void {
  const subscriptions = getSubscribedPodcasts();
  subscriptions.push(feed);
  localStorage.setItem("podcast_subscriptions", JSON.stringify(subscriptions));
}

/**
 * Unsubscribe from podcast
 */
export function unsubscribeFromPodcast(feedId: string): void {
  const subscriptions = getSubscribedPodcasts();
  const filtered = subscriptions.filter((feed) => feed.id !== feedId);
  localStorage.setItem("podcast_subscriptions", JSON.stringify(filtered));
}

/**
 * Get all subscribed podcasts
 */
export function getSubscribedPodcasts(): PodcastFeed[] {
  const data = localStorage.getItem("podcast_subscriptions");
  return data ? JSON.parse(data) : [];
}

/**
 * Update podcast episode playback position
 */
export function updateEpisodeProgress(
  feedId: string,
  episodeId: string,
  position: number,
  played?: boolean
): void {
  const subscriptions = getSubscribedPodcasts();
  const feed = subscriptions.find((f) => f.id === feedId);

  if (feed) {
    const episode = feed.episodes.find((e) => e.id === episodeId);
    if (episode) {
      episode.position = position;
      if (played !== undefined) {
        episode.played = played;
      }
      localStorage.setItem("podcast_subscriptions", JSON.stringify(subscriptions));
    }
  }
}

/**
 * Mark episode as played
 */
export function markEpisodePlayed(
  feedId: string,
  episodeId: string,
  played: boolean = true
): void {
  updateEpisodeProgress(feedId, episodeId, 0, played);
}

/**
 * Get episode playback position
 */
export function getEpisodePosition(
  feedId: string,
  episodeId: string
): number | undefined {
  const subscriptions = getSubscribedPodcasts();
  const feed = subscriptions.find((f) => f.id === feedId);

  if (feed) {
    const episode = feed.episodes.find((e) => e.id === episodeId);
    return episode?.position;
  }
  return undefined;
}

/**
 * Search episodes across all podcasts
 */
export function searchEpisodes(query: string): Array<{
  feed: PodcastFeed;
  episode: PodcastEpisode;
}> {
  const subscriptions = getSubscribedPodcasts();
  const results: Array<{ feed: PodcastFeed; episode: PodcastEpisode }> = [];
  const lowerQuery = query.toLowerCase();

  subscriptions.forEach((feed) => {
    feed.episodes.forEach((episode) => {
      if (
        episode.title.toLowerCase().includes(lowerQuery) ||
        episode.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push({ feed, episode });
      }
    });
  });

  return results;
}

/**
 * Get new/ unplayed episodes
 */
export function getUnplayedEpisodes(): Array<{
  feed: PodcastFeed;
  episode: PodcastEpisode;
}> {
  const subscriptions = getSubscribedPodcasts();
  const results: Array<{ feed: PodcastFeed; episode: PodcastEpisode }> = [];

  subscriptions.forEach((feed) => {
    feed.episodes.forEach((episode) => {
      if (!episode.played) {
        results.push({ feed, episode });
      }
    });
  });

  // Sort by pub date (newest first)
  results.sort(
    (a, b) =>
      new Date(b.episode.pubDate).getTime() - new Date(a.episode.pubDate).getTime()
  );

  return results;
}

/**
 * Get queue of episodes to listen to
 */
export function getEpisodeQueue(): PodcastEpisode[] {
  const subscriptions = getSubscribedPodcasts();
  const queue: PodcastEpisode[] = [];

  subscriptions.forEach((feed) => {
    feed.episodes.forEach((episode) => {
      // Include unplayed or partially played episodes
      if (!episode.played || (episode.position !== undefined && episode.position > 0)) {
        queue.push(episode);
      }
    });
  });

  // Sort by pub date (oldest first)
  queue.sort(
    (a, b) =>
      new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime()
  );

  return queue;
}

/**
 * Discover popular podcasts (mock data for demo)
 */
export async function discoverPodcasts(): Promise<PodcastFeed[]> {
  // In a real implementation, this would query a podcast directory API
  // For now, return some popular podcast feeds
  const popularFeeds = [
    "https://feeds.npr.org/510289/podcast.xml",
    "https://feeds.simplecast.com/qm_9xx0g",
    "https://feeds.feedburner.com/tedtalks_audio",
    "https://feeds.acast.com/public/shows/the-diary-of-a-ceo",
  ];

  const results: PodcastFeed[] = [];

  for (const feedUrl of popularFeeds) {
    try {
      const feed = await parsePodcastFeed(feedUrl);
      if (feed) {
        results.push(feed);
      }
    } catch (error) {
      console.error(`Failed to fetch feed: ${feedUrl}`, error);
    }
  }

  return results;
}

/**
 * Validate podcast feed URL
 */
export function isValidPodcastUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
