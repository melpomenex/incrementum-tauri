import { useState, useMemo } from "react";
import {
  Search,
  Rss,
  ExternalLink,
  Check,
  Filter,
  Grid3x3,
  List,
  User,
  Globe,
  BookOpen,
  Zap,
  Heart,
  Briefcase,
  TrendingUp,
  Laptop,
  Microscope,
  GraduationCap,
  Palette,
  Coffee,
  Landmark,
  Coins,
  X,
} from "lucide-react";
import {
  newsletterDirectory,
  newsletterCategories,
  type NewsletterCategory,
  type NewsletterSource,
  getNewslettersByCategory,
  searchNewsletters,
} from "../../data/newsletterDirectory";
import { subscribeToFeedAuto, type Feed } from "../../api/rss";

type ViewMode = "grid" | "list";

interface NewsletterDirectoryProps {
  onSubscribe?: (feed: Feed) => void;
  onClose?: () => void;
}

const categoryIcons: Record<NewsletterCategory, React.ElementType> = {
  technology: Laptop,
  science: Microscope,
  finance: TrendingUp,
  business: Briefcase,
  health: Heart,
  lifestyle: Coffee,
  politics: Landmark,
  arts: Palette,
  education: GraduationCap,
  crypto: Coins,
};

export function NewsletterDirectory({ onSubscribe, onClose }: NewsletterDirectoryProps) {
  const [selectedCategory, setSelectedCategory] = useState<NewsletterCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subscribing, setSubscribing] = useState<Set<string>>(new Set());

  const filteredNewsletters = useMemo(() => {
    let results = newsletterDirectory;

    if (searchQuery.trim()) {
      results = searchNewsletters(searchQuery);
    } else if (selectedCategory !== "all") {
      results = getNewslettersByCategory(selectedCategory);
    }

    return results;
  }, [selectedCategory, searchQuery]);

  const handleSubscribe = async (newsletter: NewsletterSource) => {
    if (subscribing.has(newsletter.id)) return;

    setSubscribing((prev) => new Set(prev).add(newsletter.id));

    try {
      // Create a minimal Feed object from the newsletter source
      const feed: Feed = {
        id: `newsletter-${newsletter.id}`,
        title: newsletter.title,
        description: newsletter.description,
        link: newsletter.webUrl,
        feedUrl: newsletter.feedUrl,
        imageUrl: newsletter.imageUrl,
        language: undefined,
        category: newsletter.category,
        lastUpdated: new Date().toISOString(),
        lastFetched: new Date().toISOString(),
        updateInterval: 60,
        items: [],
        subscribeDate: new Date().toISOString(),
        unreadCount: 0,
      };

      await subscribeToFeedAuto(feed);
      setSubscribedIds((prev) => new Set(prev).add(newsletter.id));

      if (onSubscribe) {
        onSubscribe(feed);
      }
    } catch (error) {
      console.error("Failed to subscribe to newsletter:", error);
      alert(`Failed to subscribe to ${newsletter.title}: ${(error as Error).message}`);
    } finally {
      setSubscribing((prev) => {
        const next = new Set(prev);
        next.delete(newsletter.id);
        return next;
      });
    }
  };

  const isSubscribed = (id: string) => subscribedIds.has(id);
  const isLoading = (id: string) => subscribing.has(id);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/70 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center border border-orange-500/30">
              <Rss className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Newsletter Directory</h1>
              <p className="text-sm text-muted-foreground">
                Discover and subscribe to popular newsletters
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search newsletters by title, author, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-background/80 border border-border/70 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 border border-border/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded transition-colors ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-6 py-4 border-b border-border/70 bg-muted/20">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All ({newsletterDirectory.length})
          </button>
          {newsletterCategories.map((category) => {
            const Icon = categoryIcons[category.id];
            const count = getNewslettersByCategory(category.id).length;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.name}</span>
                <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Newsletter List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredNewsletters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No newsletters found</h3>
            <p className="text-muted-foreground max-w-md">
              {searchQuery
                ? `No newsletters match "${searchQuery}". Try a different search term.`
                : selectedCategory !== "all"
                  ? `No newsletters in the ${newsletterCategories.find((c) => c.id === selectedCategory)?.name} category yet.`
                  : "The newsletter directory is empty."}
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                : "flex flex-col gap-3 max-w-4xl mx-auto"
            }
          >
            {filteredNewsletters.map((newsletter) => {
              const Icon = categoryIcons[newsletter.category];
              const subscribed = isSubscribed(newsletter.id);
              const loading = isLoading(newsletter.id);

              return (
                <div
                  key={newsletter.id}
                  className={`group relative bg-card/60 backdrop-blur-sm rounded-xl border ${
                    subscribed
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border/70 hover:border-orange-500/50 hover:bg-card/80"
                  } transition-all duration-200 overflow-hidden`}
                >
                  {/* Subscribed Badge */}
                  {subscribed && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-sm">
                        <Check className="w-3 h-3" />
                        <span>Subscribed</span>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className={`p-5 ${viewMode === "list" ? "flex items-start gap-4" : ""}`}>
                    {/* Icon */}
                    <div
                      className={`${
                        viewMode === "grid" ? "mb-3" : "flex-shrink-0 mt-1"
                      } w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center border border-orange-500/30`}
                    >
                      <Icon className="w-5 h-5 text-orange-500" />
                    </div>

                    {/* Info */}
                    <div className={viewMode === "grid" ? "" : "flex-1 min-w-0"}>
                      {/* Platform Badge */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-muted/60 text-muted-foreground text-xs rounded-full font-medium border border-border/50">
                          {newsletter.platform}
                        </span>
                        <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs rounded-full font-medium border border-orange-500/20">
                          {newsletterCategories.find((c) => c.id === newsletter.category)?.name}
                        </span>
                      </div>

                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {newsletter.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {newsletter.author}
                      </p>
                      <p className={`text-sm text-muted-foreground mb-4 ${viewMode === "list" ? "line-clamp-2" : "line-clamp-3"}`}>
                        {newsletter.description}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {subscribed ? (
                          <button
                            disabled
                            className="flex-1 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg shadow-sm cursor-default"
                          >
                            <Check className="w-4 h-4 inline mr-1" />
                            Subscribed
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSubscribe(newsletter)}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Rss className="w-4 h-4" />
                                Subscribe
                              </>
                            )}
                          </button>
                        )}
                        <a
                          href={newsletter.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-muted/60 text-muted-foreground text-sm font-medium rounded-lg hover:bg-muted hover:text-foreground transition-all flex items-center gap-2"
                          title="Visit website"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="hidden sm:inline">Visit</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
