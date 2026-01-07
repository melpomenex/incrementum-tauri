/**
 * RSS and Atom feed parser and management
 */

/**
 * Feed item (article/blog post)
 */
export interface FeedItem {
  id: string;
  title: string;
  description: string;
  content: string;
  link: string;
  pubDate: string;
  author?: string;
  categories: string[];
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
  guid?: string;
  read: boolean;
  favorite: boolean;
  feedId: string;
}

/**
 * Feed metadata
 */
export interface Feed {
  id: string;
  title: string;
  description: string;
  link: string;
  feedUrl: string;
  icon?: string;
  imageUrl?: string;
  language?: string;
  category?: string;
  lastUpdated: string;
  lastFetched: string;
  updateInterval: number; // in minutes
  items: FeedItem[];
  subscribeDate: string;
  unreadCount: number;
}

/**
 * Feed folder for organization
 */
export interface FeedFolder {
  id: string;
  name: string;
  feeds: string[]; // feed IDs
}

/**
 * Parse RSS/Atom feed from XML string
 */
export function parseFeed(xmlText: string, feedUrl: string): Feed | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  // Check for parsing errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    console.error("XML parsing error:", parseError.textContent);
    return null;
  }

  // Detect feed type (RSS or Atom)
  const rssChannel = xmlDoc.querySelector("channel");
  const atomFeed = xmlDoc.querySelector("feed");

  if (rssChannel) {
    return parseRSS(xmlDoc, feedUrl);
  } else if (atomFeed) {
    return parseAtom(xmlDoc, feedUrl);
  }

  return null;
}

/**
 * Parse RSS feed
 */
function parseRSS(xmlDoc: Document, feedUrl: string): Feed | null {
  const channel = xmlDoc.querySelector("channel");
  if (!channel) return null;

  const title = getElementText(channel, "title") || "Unknown Feed";
  const description =
    getElementText(channel, "description") ||
    getElementText(channel, "tagline") ||
    "";
  const link = getElementText(channel, "link") || feedUrl;
  const imageUrl =
    getElementText(channel, "image > url") ||
    getElementText(channel, "itunes:image") ||
    "";
  const language = getElementText(channel, "language");
  const category = getElementText(channel, "category");

  // Extract items
  const items = Array.from(channel.querySelectorAll("item"));
  const feedItems: FeedItem[] = items
    .map((item) => parseRSSItem(item))
    .filter((item): item is FeedItem => item !== null);

  return {
    id: generateFeedId(feedUrl),
    title,
    description,
    link,
    feedUrl,
    imageUrl,
    language,
    category,
    lastUpdated: new Date().toISOString(),
    lastFetched: new Date().toISOString(),
    updateInterval: 60, // Default 1 hour
    items: feedItems,
    subscribeDate: new Date().toISOString(),
    unreadCount: feedItems.filter((i) => !i.read).length,
  };
}

/**
 * Parse RSS item
 */
function parseRSSItem(item: Element): FeedItem | null {
  const title = getElementText(item, "title") || "Untitled";
  const description =
    getElementText(item, "description") ||
    getElementText(item, "summary") ||
    "";
  const link = getElementText(item, "link") || "";
  const pubDate = getElementText(item, "pubDate") || new Date().toISOString();
  const author = getElementText(item, "author") || getElementText(item, "dc:creator");
  const guid = getElementText(item, "guid");

  // Categories
  const categories = Array.from(item.querySelectorAll("category"))
    .map((cat) => cat.textContent?.trim())
    .filter((c): c is string => !!c);

  // Enclosure (podcast/media)
  const enclosureEl = item.querySelector("enclosure");
  let enclosure;
  if (enclosureEl) {
    enclosure = {
      url: enclosureEl.getAttribute("url") || "",
      type: enclosureEl.getAttribute("type") || "application/octet-stream",
      length: parseInt(enclosureEl.getAttribute("length") || "0") || undefined,
    };
  }

  // Extract content from content:encoded if available
  const contentEl = item.querySelector("content\\:encoded");
  const content = contentEl?.textContent || description;

  return {
    id: guid || generateItemId(link, pubDate),
    title,
    description,
    content,
    link,
    pubDate,
    author,
    categories,
    enclosure,
    guid,
    read: false,
    favorite: false,
    feedId: "", // Will be set by caller
  };
}

/**
 * Parse Atom feed
 */
function parseAtom(xmlDoc: Document, feedUrl: string): Feed | null {
  const feed = xmlDoc.querySelector("feed");
  if (!feed) return null;

  const title = getElementText(feed, "title") || "Unknown Feed";
  const description =
    getElementText(feed, "subtitle") ||
    getElementText(feed, "description") ||
    "";
  const link = getAtomLink(feed) || feedUrl;
  const icon = getElementText(feed, "icon");
  const logo = getElementText(feed, "logo");
  const imageUrl = icon || logo;
  const language = feed.getAttribute("xml:lang") || undefined;

  // Extract entries
  const entries = Array.from(feed.querySelectorAll("entry"));
  const feedItems: FeedItem[] = entries
    .map((entry) => parseAtomEntry(entry))
    .filter((item): item is FeedItem => item !== null);

  return {
    id: generateFeedId(feedUrl),
    title,
    description,
    link,
    feedUrl,
    icon,
    imageUrl,
    language,
    lastUpdated: new Date().toISOString(),
    lastFetched: new Date().toISOString(),
    updateInterval: 60,
    items: feedItems,
    subscribeDate: new Date().toISOString(),
    unreadCount: feedItems.filter((i) => !i.read).length,
  };
}

/**
 * Parse Atom entry
 */
function parseAtomEntry(entry: Element): FeedItem | null {
  const title = getElementText(entry, "title") || "Untitled";
  const content =
    getElementText(entry, "content") ||
    getElementText(entry, "summary") ||
    "";
  const link = getAtomLink(entry) || "";
  const pubDate =
    getElementText(entry, "published") ||
    getElementText(entry, "updated") ||
    new Date().toISOString();
  const author = getElementText(entry, "author > name");

  // Categories/tags
  const categories = Array.from(entry.querySelectorAll("category"))
    .map((cat) => cat.getAttribute("label") || cat.getAttribute("term"))
    .filter((c): c is string => !!c);

  // Enclosure
  const enclosureEl = entry.querySelector("link[rel='enclosure']");
  let enclosure;
  if (enclosureEl) {
    enclosure = {
      url: enclosureEl.getAttribute("href") || "",
      type: enclosureEl.getAttribute("type") || "application/octet-stream",
      length: parseInt(enclosureEl.getAttribute("length") || "0") || undefined,
    };
  }

  const id = getElementText(entry, "id") || generateItemId(link, pubDate);

  return {
    id,
    title,
    description: content,
    content,
    link,
    pubDate,
    author,
    categories,
    enclosure,
    guid: id,
    read: false,
    favorite: false,
    feedId: "",
  };
}

/**
 * Get Atom link element
 */
function getAtomLink(parent: Element): string | null {
  const linkEl = parent.querySelector(
    "link[rel='alternate'], link:not([rel])"
  );
  return linkEl?.getAttribute("href") || null;
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
 * Generate feed ID from URL
 */
function generateFeedId(feedUrl: string): string {
  let hash = 0;
  for (let i = 0; i < feedUrl.length; i++) {
    const char = feedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `feed-${Math.abs(hash)}`;
}

/**
 * Generate item ID
 */
function generateItemId(link: string, pubDate: string): string {
  return `item-${Math.abs((link + pubDate).split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0))}`;
}

/**
 * Fetch feed from URL
 */
export async function fetchFeed(feedUrl: string): Promise<Feed | null> {
  try {
    // Use CORS proxy for browser requests
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const feed = parseFeed(xmlText, feedUrl);

    if (feed) {
      feed.feedId = feed.id;
      feed.items.forEach((item) => (item.feedId = feed.id));
    }

    return feed;
  } catch (error) {
    console.error("Failed to fetch feed:", error);
    return null;
  }
}

/**
 * Subscribe to feed
 */
export function subscribeToFeed(feed: Feed): void {
  const subscriptions = getSubscribedFeeds();

  // Check if already subscribed
  if (subscriptions.find((f) => f.id === feed.id)) {
    // Update existing feed
    updateFeed(feed.id, feed);
  } else {
    // Add new subscription
    subscriptions.push(feed);
    saveFeeds(subscriptions);
  }
}

/**
 * Unsubscribe from feed
 */
export function unsubscribeFromFeed(feedId: string): void {
  const subscriptions = getSubscribedFeeds();
  const filtered = subscriptions.filter((feed) => feed.id !== feedId);
  saveFeeds(filtered);
}

/**
 * Get all subscribed feeds
 */
export function getSubscribedFeeds(): Feed[] {
  const data = localStorage.getItem("rss_feeds");
  return data ? JSON.parse(data) : [];
}

/**
 * Save feeds to localStorage
 */
function saveFeeds(feeds: Feed[]): void {
  localStorage.setItem("rss_feeds", JSON.stringify(feeds));
}

/**
 * Get feed by ID
 */
export function getFeed(feedId: string): Feed | undefined {
  const feeds = getSubscribedFeeds();
  return feeds.find((feed) => feed.id === feedId);
}

/**
 * Update feed
 */
export function updateFeed(feedId: string, updates: Partial<Feed>): void {
  const feeds = getSubscribedFeeds();
  const index = feeds.findIndex((feed) => feed.id === feedId);

  if (index !== -1) {
    feeds[index] = { ...feeds[index], ...updates };
    saveFeeds(feeds);
  }
}

/**
 * Mark item as read
 */
export function markItemRead(feedId: string, itemId: string, read: boolean = true): void {
  const feed = getFeed(feedId);
  if (!feed) return;

  const item = feed.items.find((i) => i.id === itemId);
  if (item) {
    item.read = read;
    feed.unreadCount = feed.items.filter((i) => !i.read).length;
    updateFeed(feedId, feed);
  }
}

/**
 * Mark all items in feed as read
 */
export function markFeedRead(feedId: string): void {
  const feed = getFeed(feedId);
  if (!feed) return;

  feed.items.forEach((item) => (item.read = true));
  feed.unreadCount = 0;
  updateFeed(feedId, feed);
}

/**
 * Toggle item favorite
 */
export function toggleItemFavorite(feedId: string, itemId: string): void {
  const feed = getFeed(feedId);
  if (!feed) return;

  const item = feed.items.find((i) => i.id === itemId);
  if (item) {
    item.favorite = !item.favorite;
    updateFeed(feedId, feed);
  }
}

/**
 * Get all unread items
 */
export function getUnreadItems(): Array<{ feed: Feed; item: FeedItem }> {
  const feeds = getSubscribedFeeds();
  const results: Array<{ feed: Feed; item: FeedItem }> = [];

  feeds.forEach((feed) => {
    feed.items.forEach((item) => {
      if (!item.read) {
        results.push({ feed, item });
      }
    });
  });

  // Sort by pub date (newest first)
  results.sort(
    (a, b) =>
      new Date(b.item.pubDate).getTime() - new Date(a.item.pubDate).getTime()
  );

  return results;
}

/**
 * Get favorite items
 */
export function getFavoriteItems(): Array<{ feed: Feed; item: FeedItem }> {
  const feeds = getSubscribedFeeds();
  const results: Array<{ feed: Feed; item: FeedItem }> = [];

  feeds.forEach((feed) => {
    feed.items.forEach((item) => {
      if (item.favorite) {
        results.push({ feed, item });
      }
    });
  });

  return results;
}

/**
 * Search feed items
 */
export function searchFeedItems(query: string): Array<{
  feed: Feed;
  item: FeedItem;
}> {
  const feeds = getSubscribedFeeds();
  const results: Array<{ feed: Feed; item: FeedItem }> = [];
  const lowerQuery = query.toLowerCase();

  feeds.forEach((feed) => {
    feed.items.forEach((item) => {
      if (
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery)
      ) {
        results.push({ feed, item });
      }
    });
  });

  return results;
}

/**
 * Get feed folders
 */
export function getFeedFolders(): FeedFolder[] {
  const data = localStorage.getItem("rss_folders");
  return data ? JSON.parse(data) : [];
}

/**
 * Save feed folders
 */
function saveFeedFolders(folders: FeedFolder[]): void {
  localStorage.setItem("rss_folders", JSON.stringify(folders));
}

/**
 * Create folder
 */
export function createFolder(name: string): FeedFolder {
  const folders = getFeedFolders();
  const folder: FeedFolder = {
    id: `folder-${Date.now()}`,
    name,
    feeds: [],
  };
  folders.push(folder);
  saveFeedFolders(folders);
  return folder;
}

/**
 * Add feed to folder
 */
export function addFeedToFolder(folderId: string, feedId: string): void {
  const folders = getFeedFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (folder && !folder.feeds.includes(feedId)) {
    folder.feeds.push(feedId);
    saveFeedFolders(folders);
  }
}

/**
 * Import OPML file
 */
export function importOPML(opmlContent: string): Feed[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opmlContent, "text/xml");

  const outlines = xmlDoc.querySelectorAll("outline");
  const feeds: Feed[] = [];

  outlines.forEach((outline) => {
    const xmlUrl = outline.getAttribute("xmlUrl");
    const htmlUrl = outline.getAttribute("htmlUrl");
    const title = outline.getAttribute("title") || outline.getAttribute("text") || "Unknown Feed";

    if (xmlUrl) {
      feeds.push({
        id: generateFeedId(xmlUrl),
        title,
        description: "",
        link: htmlUrl || xmlUrl,
        feedUrl: xmlUrl,
        lastUpdated: new Date().toISOString(),
        lastFetched: new Date().toISOString(),
        updateInterval: 60,
        items: [],
        subscribeDate: new Date().toISOString(),
        unreadCount: 0,
      });
    }
  });

  return feeds;
}

/**
 * Export feeds to OPML
 */
export function exportOPML(): string {
  const feeds = getSubscribedFeeds();

  let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Incrementum Feed Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
`;

  feeds.forEach((feed) => {
    opml += `    <outline type="rss" text="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.feedUrl)}" htmlUrl="${escapeXml(feed.link)}"/>\n`;
  });

  opml += `  </body>
</opml>`;

  return opml;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format date for display
 */
export function formatFeedDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
