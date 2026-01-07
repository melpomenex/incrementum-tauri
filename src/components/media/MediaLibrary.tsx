import { useState, useEffect } from "react";
import {
  Film,
  Music,
  Rss,
  Youtube,
  Search,
  Grid,
  List,
  Plus,
  FolderPlus,
  Trash2,
  Edit,
  Play,
  Star,
  Clock,
  TrendingUp,
  Download,
  Upload,
} from "lucide-react";
import {
  MediaItem,
  MediaType,
  MediaPlaylist,
  getAllMediaItems,
  getRecentlyAdded,
  getRecentlyPlayed,
  getMostPlayed,
  searchMediaItems,
  filterByType,
  recordPlayback,
  deleteMediaItem,
  updateMediaItem,
  getMediaPlaylists,
  createPlaylist,
  deletePlaylist,
  addToPlaylist,
  formatFileSize,
  formatDuration,
  getLibraryStats,
  exportLibraryData,
  importLibraryData,
} from "../../api/media-library";

type ViewMode = "grid" | "list";
type SortBy = "title" | "dateAdded" | "lastPlayed" | "playCount" | "duration";
type FilterType = "all" | MediaType;
type ViewSection = "library" | "playlists" | "folders";

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("dateAdded");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [section, setSection] = useState<ViewSection>("library");
  const [playlists, setPlaylists] = useState<MediaPlaylist[]>([]);
  const [stats, setStats] = useState(getLibraryStats());

  // Load items
  useEffect(() => {
    loadItems();
    loadPlaylists();
    setStats(getLibraryStats());
  }, []);

  // Filter and sort items
  useEffect(() => {
    let result = [...items];

    // Apply type filter
    if (filterType !== "all") {
      result = result.filter((item) => item.type === filterType);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          (item.artist && item.artist.toLowerCase().includes(query)) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "dateAdded":
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
        case "lastPlayed":
          if (!a.lastPlayedDate) return 1;
          if (!b.lastPlayedDate) return -1;
          return new Date(b.lastPlayedDate).getTime() - new Date(a.lastPlayedDate).getTime();
        case "playCount":
          return b.playCount - a.playCount;
        case "duration":
          return (b.duration || 0) - (a.duration || 0);
        default:
          return 0;
      }
    });

    setFilteredItems(result);
  }, [items, filterType, searchQuery, sortBy]);

  const loadItems = () => {
    setItems(getAllMediaItems());
  };

  const loadPlaylists = () => {
    setPlaylists(getMediaPlaylists());
  };

  const handlePlayItem = (item: MediaItem) => {
    recordPlayback(item.id, 0);
    setSelectedItem(item);
    // In real implementation, would open in media player
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMediaItem(id);
      loadItems();
    }
  };

  const handleRateItem = (id: string, rating: number) => {
    updateMediaItem(id, { rating });
    loadItems();
  };

  const handleExport = () => {
    const data = exportLibraryData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-library-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = event.target?.result as string;
          if (importLibraryData(data)) {
            loadItems();
            loadPlaylists();
            alert("Library imported successfully!");
          } else {
            alert("Failed to import library");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "video":
        return Film;
      case "audio":
        return Music;
      case "podcast":
        return Rss;
      case "youtube":
        return Youtube;
    }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        {/* Navigation */}
        <div className="p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Media Library</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setSection("library")}
              className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 ${
                section === "library"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Grid className="w-4 h-4" />
              Library
            </button>
            <button
              onClick={() => setSection("playlists")}
              className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 ${
                section === "playlists"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <List className="w-4 h-4" />
              Playlists
            </button>
            <button
              onClick={() => setSection("folders")}
              className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 ${
                section === "folders"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              Folders
            </button>
          </nav>
        </div>

        {/* Quick Stats */}
        <div className="px-4 py-2 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">STATISTICS</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-foreground">
              <span>Total items</span>
              <span>{stats.totalItems}</span>
            </div>
            <div className="flex justify-between text-foreground">
              <span>Total duration</span>
              <span>{formatDuration(stats.totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Import/Export */}
        <div className="px-4 py-2 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">MANAGE</h3>
          <div className="space-y-1">
            <button
              onClick={handleExport}
              className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Library
            </button>
            <button
              onClick={handleImport}
              className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Library
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4 mb-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search media..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="podcast">Podcasts</option>
              <option value="youtube">YouTube</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="dateAdded">Recently Added</option>
              <option value="lastPlayed">Recently Played</option>
              <option value="playCount">Most Played</option>
              <option value="title">Title</option>
              <option value="duration">Duration</option>
            </select>

            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-muted" : ""}`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-muted" : ""}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setItems(getRecentlyAdded(20))}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-full hover:opacity-90"
            >
              Recently Added
            </button>
            <button
              onClick={() => setItems(getRecentlyPlayed(20))}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-full hover:opacity-90"
            >
              Recently Played
            </button>
            <button
              onClick={() => setItems(getMostPlayed(20))}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-full hover:opacity-90"
            >
              Most Played
            </button>
            <button
              onClick={() => loadItems()}
              className="px-3 py-1 text-sm text-muted-foreground hover:bg-muted rounded-full"
            >
              Show All
            </button>
          </div>
        </div>

        {/* Items Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No media items found</p>
              <p className="text-sm">
                {searchQuery || filterType !== "all"
                  ? "Try adjusting your filters"
                  : "Add media files to get started"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
                <MediaGridItem
                  key={item.id}
                  item={item}
                  onPlay={handlePlayItem}
                  onDelete={handleDeleteItem}
                  onRate={handleRateItem}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <MediaListItem
                  key={item.id}
                  item={item}
                  onPlay={handlePlayItem}
                  onDelete={handleDeleteItem}
                  onRate={handleRateItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MediaGridItemProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

function MediaGridItem({ item, onPlay, onDelete, onRate }: MediaGridItemProps) {
  const Icon = getMediaIcon(item.type);

  return (
    <div className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-12 h-12 text-muted-foreground" />
        )}

        {/* Play overlay */}
        <button
          onClick={() => onPlay(item)}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
            <Play className="w-6 h-6" fill="currentColor" />
          </div>
        </button>

        {/* Duration badge */}
        {item.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
            {formatDuration(item.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
        {item.artist && (
          <p className="text-xs text-muted-foreground truncate">{item.artist}</p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(item.id, star)}
              className="text-xs"
            >
              <Star
                className={`w-3 h-3 ${
                  (item.rating || 0) >= star
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(item.id)}
        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded"
        title="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

interface MediaListItemProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

function MediaListItem({ item, onPlay, onDelete, onRate }: MediaListItemProps) {
  const Icon = getMediaIcon(item.type);

  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group">
      {/* Thumbnail */}
      <div className="w-20 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 relative">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover rounded" />
        ) : (
          <Icon className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {item.artist && <span>{item.artist}</span>}
          {item.duration && <span>{formatDuration(item.duration)}</span>}
          {item.playCount > 0 && <span>{item.playCount} plays</span>}
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(item.id, star)}
            className="text-sm"
          >
            <Star
              className={`w-4 h-4 ${
                (item.rating || 0) >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onPlay(item)}
          className="p-2 text-primary hover:bg-primary/20 rounded"
          title="Play"
        >
          <Play className="w-4 h-4" fill="currentColor" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-destructive hover:bg-destructive/20 rounded"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function getMediaIcon(type: MediaType) {
  switch (type) {
    case "video":
      return Film;
    case "audio":
      return Music;
    case "podcast":
      return Rss;
    case "youtube":
      return Youtube;
  }
}
