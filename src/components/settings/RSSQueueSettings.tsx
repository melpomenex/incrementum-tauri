/**
 * RSS Queue Settings
 * 
 * Configure how RSS feed items appear in the main reading queue:
 * - Enable/disable RSS in queue
 * - Set percentage of queue that should be RSS
 * - Set max items per session
 * - Choose which specific feeds appear in the queue
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { X, Rss, Settings2, Percent, ListFilter, EyeOff, Eye, ArrowUpDown } from "lucide-react";
import { cn } from "../../utils";
import { defaultSettings, useSettingsStore, type RSSQueueSettings } from "../../stores/settingsStore";
import { getSubscribedFeeds, type Feed } from "../../api/rss";
import { useToast } from "../common/Toast";

interface RSSQueueSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RSSQueueSettingsModal({ isOpen, onClose }: RSSQueueSettingsProps) {
  const { settings, updateSettingsCategory } = useSettingsStore();
  const toast = useToast();
  
  const rssSettings = settings.rssQueue ?? defaultSettings.rssQueue;
  const feeds = useMemo(() => getSubscribedFeeds(), [isOpen]);
  
  // Local state for form
  const [includeInQueue, setIncludeInQueue] = useState(rssSettings.includeInQueue);
  const [percentage, setPercentage] = useState(rssSettings.percentage);
  const [maxItems, setMaxItems] = useState(rssSettings.maxItemsPerSession);
  const [includedFeedIds, setIncludedFeedIds] = useState<string[]>(rssSettings.includedFeedIds);
  const [excludedFeedIds, setExcludedFeedIds] = useState<string[]>(rssSettings.excludedFeedIds);
  const [unreadOnly, setUnreadOnly] = useState(rssSettings.unreadOnly);
  const [preferRecent, setPreferRecent] = useState(rssSettings.preferRecent);

  useEffect(() => {
    if (!isOpen) return;
    setIncludeInQueue(rssSettings.includeInQueue);
    setPercentage(rssSettings.percentage);
    setMaxItems(rssSettings.maxItemsPerSession);
    setIncludedFeedIds(rssSettings.includedFeedIds);
    setExcludedFeedIds(rssSettings.excludedFeedIds);
    setUnreadOnly(rssSettings.unreadOnly);
    setPreferRecent(rssSettings.preferRecent);
  }, [isOpen, rssSettings]);
  
  const handleSave = useCallback(() => {
    const newSettings: RSSQueueSettings = {
      includeInQueue,
      percentage,
      maxItemsPerSession: maxItems,
      includedFeedIds,
      excludedFeedIds,
      unreadOnly,
      preferRecent,
    };
    
    updateSettingsCategory("rssQueue", newSettings);
    toast.success("Settings saved", "RSS queue settings have been updated");
    onClose();
  }, [includeInQueue, percentage, maxItems, includedFeedIds, excludedFeedIds, unreadOnly, preferRecent, updateSettingsCategory, toast, onClose]);
  
  const toggleFeedInclusion = useCallback((feedId: string) => {
    setIncludedFeedIds(prev => {
      if (prev.includes(feedId)) {
        return prev.filter(id => id !== feedId);
      }
      return [...prev, feedId];
    });
  }, []);
  
  const toggleFeedExclusion = useCallback((feedId: string) => {
    setExcludedFeedIds(prev => {
      if (prev.includes(feedId)) {
        return prev.filter(id => id !== feedId);
      }
      return [...prev, feedId];
    });
  }, []);
  
  const isFeedIncluded = useCallback((feedId: string) => {
    // If includedFeedIds is empty, all feeds are included by default
    if (includedFeedIds.length === 0) return true;
    return includedFeedIds.includes(feedId);
  }, [includedFeedIds]);
  
  const isFeedExcluded = useCallback((feedId: string) => {
    return excludedFeedIds.includes(feedId);
  }, [excludedFeedIds]);
  
  const getFeedStatus = useCallback((feedId: string): "included" | "excluded" | "default" => {
    if (isFeedExcluded(feedId)) return "excluded";
    if (includedFeedIds.length === 0 || isFeedIncluded(feedId)) return "included";
    return "default";
  }, [isFeedIncluded, isFeedExcluded, includedFeedIds.length]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Rss className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">RSS Queue Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure how RSS items appear in your reading queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {includeInQueue ? (
                <Eye className="w-5 h-5 text-green-500" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-medium">Include RSS in Queue</h3>
                <p className="text-sm text-muted-foreground">
                  Show RSS articles in the main reading queue
                </p>
              </div>
            </div>
            <button
              onClick={() => setIncludeInQueue(!includeInQueue)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                includeInQueue ? "bg-primary" : "bg-muted-foreground/20"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  includeInQueue ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          
          {includeInQueue && (
            <>
              {/* Percentage Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Queue Percentage</span>
                  </div>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-sm text-muted-foreground">
                  Approximately {percentage}% of your queue will be RSS articles
                </p>
              </div>
              
              {/* Max Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Max Items Per Session</span>
                  </div>
                  <span className="text-sm font-medium">
                    {maxItems === 0 ? "Unlimited" : maxItems}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={maxItems}
                  onChange={(e) => setMaxItems(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-sm text-muted-foreground">
                  {maxItems === 0 
                    ? "No limit on RSS items per session" 
                    : `Maximum ${maxItems} RSS articles per session`}
                </p>
              </div>
              
              {/* Options */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  Options
                </h3>
                
                <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(e) => setUnreadOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <div>
                    <span className="font-medium">Unread Only</span>
                    <p className="text-sm text-muted-foreground">
                      Only include articles you haven't read yet
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferRecent}
                    onChange={(e) => setPreferRecent(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <div>
                    <span className="font-medium">Prefer Recent</span>
                    <p className="text-sm text-muted-foreground">
                      Prioritize newer articles over older ones
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Feed Selection */}
              {feeds.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    Feed Selection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which feeds appear in your queue. By default, all feeds are included.
                  </p>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg">
                    {feeds.map((feed) => {
                      const status = getFeedStatus(feed.id);
                      return (
                        <div
                          key={feed.id}
                          className={cn(
                            "flex items-center justify-between p-3 hover:bg-muted/30 transition-colors",
                            status === "excluded" && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {feed.imageUrl ? (
                              <img
                                src={feed.imageUrl}
                                alt=""
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                <Rss className="w-4 h-4 text-orange-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{feed.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {feed.unreadCount} unread
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {status === "excluded" ? (
                              <button
                                onClick={() => toggleFeedExclusion(feed.id)}
                                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                              >
                                Include
                              </button>
                            ) : (
                              <>
                                {includedFeedIds.length > 0 && (
                                  <button
                                    onClick={() => toggleFeedInclusion(feed.id)}
                                    className={cn(
                                      "px-3 py-1.5 text-sm rounded-md transition-colors",
                                      status === "included"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted hover:bg-muted/80"
                                    )}
                                  >
                                    {status === "included" ? "In Queue" : "Include"}
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleFeedExclusion(feed.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                  title="Exclude from queue"
                                >
                                  <EyeOff className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIncludedFeedIds([]);
                        setExcludedFeedIds([]);
                      }}
                      className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      Include All
                    </button>
                    <button
                      onClick={() => {
                        setIncludedFeedIds([]);
                        setExcludedFeedIds(feeds.map(f => f.id));
                      }}
                      className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      Exclude All
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
