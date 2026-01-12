export interface RssFeed {
  id: string;
  url: string;
  title: string;
  description?: string;
  category?: string;
  updateInterval: number; // in minutes
  lastFetched?: string;
  isActive: boolean;
  dateAdded: string;
  autoQueue: boolean; // Automatically add new articles to queue
  folder?: string; // For organizing feeds into folders
  unreadCount?: number; // Calculated field
  favicon?: string;
}

export interface RssArticle {
  id: string;
  feedId: string;
  url: string;
  title: string;
  author?: string;
  publishedDate?: string;
  content?: string;
  summary?: string;
  imageUrl?: string;
  isQueued: boolean;
  isRead: boolean;
  dateAdded: string;
  isFavorite?: boolean;
  isLiked?: boolean; // For intelligence training (NewsBlur-inspired)
  isDisliked?: boolean; // For intelligence training (NewsBlur-inspired)
  tags?: string[];
}

export interface RssFeedWithArticles extends RssFeed {
  articles: RssArticle[];
}

export interface RssFeedFolder {
  name: string;
  isExpanded: boolean;
  feedIds: string[];
}

export type RssViewMode = "list" | "split" | "grid" | "magazine";

export type RssSortOption = "date" | "title" | "unread" | "feed";

export interface RssFilters {
  showUnreadOnly: boolean;
  showFavoritesOnly: boolean;
  selectedFeedId?: string;
  selectedFolder?: string;
  searchQuery?: string;
}

export interface ParsedFeed {
  title: string;
  description?: string;
  url: string;
  articles: ParsedArticle[];
}

export interface ParsedArticle {
  url: string;
  title: string;
  author?: string;
  publishedDate?: string;
  content?: string;
  summary?: string;
  imageUrl?: string;
}

export interface OPMLFeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  description?: string;
  category?: string;
}
