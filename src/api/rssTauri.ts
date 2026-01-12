/**
 * Tauri RSS API - Wrapper for backend RSS commands
 */

import { invoke } from "@tauri-apps/api/core";
import type { RssFeed, RssArticle } from "../types/rss";

/**
 * Feed Management
 */

export async function createRssFeed(
  url: string,
  title: string,
  description?: string,
  category?: string,
  updateInterval?: number,
  autoQueue?: boolean
): Promise<RssFeed> {
  return await invoke<RssFeed>("create_rss_feed", {
    url,
    title,
    description,
    category,
    updateInterval,
    autoQueue,
  });
}

export async function getRssFeeds(): Promise<RssFeed[]> {
  return await invoke<RssFeed[]>("get_rss_feeds");
}

export async function getRssFeed(id: string): Promise<RssFeed | null> {
  return await invoke<RssFeed | null>("get_rss_feed", { id });
}

export async function updateRssFeed(
  id: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    updateInterval?: number;
    autoQueue?: boolean;
    isActive?: boolean;
  }
): Promise<RssFeed> {
  return await invoke<RssFeed>("update_rss_feed", {
    id,
    ...updates,
  });
}

export async function deleteRssFeed(id: string): Promise<void> {
  await invoke("delete_rss_feed", { id });
}

export async function updateRssFeedFetched(id: string): Promise<void> {
  await invoke("update_rss_feed_fetched", { id });
}

export async function getRssFeedUnreadCount(feedId: string): Promise<number> {
  return await invoke<number>("get_rss_feed_unread_count", { feedId });
}

/**
 * Article Management
 */

export async function createRssArticle(
  feedId: string,
  url: string,
  title: string,
  author?: string,
  publishedDate?: string,
  content?: string,
  summary?: string,
  imageUrl?: string
): Promise<RssArticle> {
  return await invoke<RssArticle>("create_rss_article", {
    feedId,
    url,
    title,
    author,
    publishedDate,
    content,
    summary,
    imageUrl,
  });
}

export async function getRssArticles(
  feedId?: string,
  limit?: number
): Promise<RssArticle[]> {
  return await invoke<RssArticle[]>("get_rss_articles", { feedId, limit });
}

export async function markRssArticleRead(
  id: string,
  isRead: boolean
): Promise<void> {
  await invoke("mark_rss_article_read", { id, isRead });
}

export async function toggleRssArticleQueued(id: string): Promise<boolean> {
  return await invoke<boolean>("toggle_rss_article_queued", { id });
}

export async function cleanupOldRssArticles(days: number): Promise<number> {
  return await invoke<number>("cleanup_old_rss_articles", { days });
}

/**
 * Feed Fetching (client-side HTTP fetch with CORS proxy)
 */

const CORS_PROXY = "https://api.allorigins.win/raw?url=";

export async function fetchFeedContent(feedUrl: string): Promise<string> {
  const response = await fetch(`${CORS_PROXY}${encodeURIComponent(feedUrl)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.statusText}`);
  }
  return await response.text();
}

export interface ParsedFeedData {
  title: string;
  description?: string;
  link?: string;
  items: ParsedArticleData[];
}

export interface ParsedArticleData {
  title: string;
  url: string;
  author?: string;
  publishedDate?: string;
  content?: string;
  summary?: string;
  imageUrl?: string;
}

/**
 * Parse RSS/Atom feed XML
 */
export function parseFeedXml(xmlText: string): ParsedFeedData | null {
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
    return parseRSS(xmlDoc);
  } else if (atomFeed) {
    return parseAtom(xmlDoc);
  }

  return null;
}

function getElementText(parent: Element, selector: string): string | undefined {
  const element = parent.querySelector(selector);
  return element?.textContent?.trim() || undefined;
}

function parseRSS(xmlDoc: Document): ParsedFeedData | null {
  const channel = xmlDoc.querySelector("channel");
  if (!channel) return null;

  const title = getElementText(channel, "title") || "Unknown Feed";
  const description = getElementText(channel, "description");
  const link = getElementText(channel, "link");

  const items: ParsedArticleData[] = [];
  const itemElements = channel.querySelectorAll("item");

  itemElements.forEach((item) => {
    const itemTitle = getElementText(item, "title") || "Untitled";
    const itemUrl = getElementText(item, "link") || getElementText(item, "guid") || "";
    const author = getElementText(item, "author") || getElementText(item, "dc\\:creator");
    const publishedDate = getElementText(item, "pubDate");
    const content = getElementText(item, "content\\:encoded") || getElementText(item, "description");
    const summary = getElementText(item, "description");
    const imageUrl = getElementText(item, "media\\:thumbnail") ||
                     item.querySelector("enclosure[type^='image']")?.getAttribute("url") || undefined;

    items.push({
      title: itemTitle,
      url: itemUrl,
      author,
      publishedDate,
      content,
      summary,
      imageUrl,
    });
  });

  return { title, description, link, items };
}

function parseAtom(xmlDoc: Document): ParsedFeedData | null {
  const feed = xmlDoc.querySelector("feed");
  if (!feed) return null;

  const title = getElementText(feed, "title") || "Unknown Feed";
  const description = getElementText(feed, "subtitle");
  const linkEl = feed.querySelector("link[rel='alternate']") || feed.querySelector("link");
  const link = linkEl?.getAttribute("href") || undefined;

  const items: ParsedArticleData[] = [];
  const entryElements = feed.querySelectorAll("entry");

  entryElements.forEach((entry) => {
    const itemTitle = getElementText(entry, "title") || "Untitled";
    const linkEl = entry.querySelector("link[rel='alternate']") || entry.querySelector("link");
    const itemUrl = linkEl?.getAttribute("href") || "";
    const author = getElementText(entry, "author > name");
    const publishedDate = getElementText(entry, "published") || getElementText(entry, "updated");
    const content = getElementText(entry, "content");
    const summary = getElementText(entry, "summary");
    const imageUrl = entry.querySelector("link[rel='enclosure'][type^='image']")?.getAttribute("href") || undefined;

    items.push({
      title: itemTitle,
      url: itemUrl,
      author,
      publishedDate,
      content,
      summary,
      imageUrl,
    });
  });

  return { title, description, link, items };
}

/**
 * OPML Import/Export
 */

export interface OPMLFeed {
  title: string;
  feedUrl: string;
  htmlUrl?: string;
  description?: string;
  category?: string;
}

/**
 * Import OPML file
 */
export function importOPML(opmlContent: string): OPMLFeed[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opmlContent, "text/xml");

  const outlines = xmlDoc.querySelectorAll("outline");
  const feeds: OPMLFeed[] = [];

  outlines.forEach((outline) => {
    const xmlUrl = outline.getAttribute("xmlUrl");
    if (xmlUrl) {
      feeds.push({
        title: outline.getAttribute("text") || outline.getAttribute("title") || "Untitled Feed",
        feedUrl: xmlUrl,
        htmlUrl: outline.getAttribute("htmlUrl") || undefined,
        description: outline.getAttribute("description") || undefined,
        category: outline.getAttribute("category") || undefined,
      });
    }
  });

  return feeds;
}

/**
 * Export feeds to OPML
 */
export function exportOPML(feeds: { title: string; url: string; description?: string; category?: string }[]): string {
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Incrementum RSS Feed Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
`;

  feeds.forEach((feed) => {
    opml += `    <outline type="rss" text="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}"`;
    if (feed.description) {
      opml += ` description="${escapeXml(feed.description)}"`;
    }
    if (feed.category) {
      opml += ` category="${escapeXml(feed.category)}"`;
    }
    opml += `/>\n`;
  });

  opml += `  </body>
</opml>`;

  return opml;
}
