import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Info,
  Keyboard,
  LayoutList,
  Play,
  Smartphone,
  Sparkles,
  Target,
} from "lucide-react";
import { useQueueStore, type QueueFilterMode } from "../../stores/queueStore";
import type { QueueItem } from "../../types/queue";
import { ItemDetailsPopover, type ItemDetailsTarget } from "../common/ItemDetailsPopover";
import {
  PriorityPreset,
  buildSessionBlocks,
  formatMinutesRange,
  getFsrsMetrics,
  getFsrsSchedulingInfo,
  getPriorityScore,
  getPriorityVector,
  getQueueStatus,
  getReadingImpact,
  getStatusLabel,
  getTimeEstimateRange,
  isScheduledItem,
  type SessionCustomizationOptions,
} from "../../utils/reviewUx";
import {
  SessionCustomizeModal,
  DEFAULT_CUSTOMIZATION,
  type SessionCustomization,
} from "./SessionCustomizeModal";

type QueueMode = "reading" | "review";

interface ReviewQueueViewProps {
  onStartReview?: () => void;
  onOpenDocument?: (item: QueueItem) => void;
  onOpenScrollMode?: () => void;
}

export function ReviewQueueView({ onStartReview, onOpenDocument, onOpenScrollMode }: ReviewQueueViewProps) {
  const {
    items,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    loadQueue,
    loadStats,
    selectedIds,
    setSelected,
    selectAll,
    clearSelection,
    bulkSuspend,
    bulkUnsuspend,
    bulkDelete,
    bulkOperationLoading,
    bulkOperationResult,
    clearBulkResult,
    queueFilterMode,
    setQueueFilterMode,
  } = useQueueStore();
  const [queueMode, setQueueMode] = useState<QueueMode>("reading");
  const [preset, setPreset] = useState<PriorityPreset>("maximize-retention");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInspectorOpen, setInspectorOpen] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [isCustomizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [sessionCustomization, setSessionCustomization] = useState<SessionCustomization>(DEFAULT_CUSTOMIZATION);
  const searchRef = useRef<HTMLInputElement>(null);

  // Debug: Check if scroll mode is available
  useEffect(() => {
    console.log("ReviewQueueView state:", { queueMode, onOpenScrollMode: !!onOpenScrollMode });
  }, [queueMode, onOpenScrollMode]);

  useEffect(() => {
    // Load queue based on current filter mode
    switch (queueFilterMode) {
      case "due-today":
        loadDueDocumentsOnly();
        break;
      case "due-all":
        loadDueQueueItems();
        break;
      case "all-items":
      case "new-only":
      default:
        loadQueue();
        break;
    }
    loadStats();
  }, [queueFilterMode, loadQueue, loadDueDocumentsOnly, loadDueQueueItems, loadStats]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const queueItems = items.filter((item) => {
      if (queueMode === "review") {
        return item.itemType === "learning-item" && isScheduledItem(item);
      }
      // Reading mode: only show imported documents (books/articles/RSS), not extracts or learning items
      return item.itemType === "document";
    });
    const searchedItems = normalizedQuery
      ? queueItems.filter((item) => {
          const haystack = [item.documentTitle, item.category, ...(item.tags ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : queueItems;
    return [...searchedItems].sort((a, b) => getPriorityScore(b, preset) - getPriorityScore(a, preset));
  }, [items, queueMode, preset, searchQuery]);

  const selectableItems = useMemo(
    () => visibleItems.filter((item) => item.itemType === "learning-item"),
    [visibleItems]
  );

  const allSelected = selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.id));

  const sessionBlocks = useMemo(() => {
    const options: SessionCustomizationOptions = {
      maxItems: sessionCustomization.maxItems,
      blockTimeBudgets: sessionCustomization.blockTimeBudgets,
      filters: sessionCustomization.filters,
      itemTypes: sessionCustomization.itemTypes,
      priorityPreset: preset,
    };
    return buildSessionBlocks(visibleItems, options);
  }, [visibleItems, sessionCustomization, preset]);
  const selectedItem = useMemo(
    () => visibleItems.find((item) => item.id === selectedId) ?? null,
    [visibleItems, selectedId]
  );

  useEffect(() => {
    if (!selectedItem && visibleItems.length > 0) {
      setSelectedId(visibleItems[0].id);
    }
  }, [selectedItem, visibleItems]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        setInspectorOpen((prev) => !prev);
        return;
      }
      if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (visibleItems.length === 0) return;
        const currentIndex = visibleItems.findIndex((item) => item.id === selectedId);
        const delta = event.key.toLowerCase() === "j" ? 1 : -1;
        const nextIndex = currentIndex === -1 ? 0 : Math.min(visibleItems.length - 1, Math.max(0, currentIndex + delta));
        setSelectedId(visibleItems[nextIndex].id);
        return;
      }
      if (event.key === "Enter" && selectedItem) {
        if (selectedItem.itemType === "learning-item") {
          onStartReview?.();
        } else {
          onOpenDocument?.(selectedItem);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenDocument, onStartReview, selectedId, selectedItem, visibleItems]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartOptimalSession = () => {
    onStartReview?.();
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  const handleBulkSuspend = async () => {
    await bulkSuspend();
  };

  const handleBulkUnsuspend = async () => {
    await bulkUnsuspend();
  };

  const handleBulkDelete = async () => {
    await bulkDelete();
  };

  const buildDetailsTarget = (item: QueueItem): ItemDetailsTarget => {
    if (item.itemType === "learning-item") {
      return {
        type: "learning-item",
        id: item.learningItemId ?? item.id,
        title: item.documentTitle,
        tags: item.tags,
        category: item.category,
      };
    }
    if (item.itemType === "extract") {
      return {
        type: "extract",
        id: item.extractId ?? item.id,
        title: item.documentTitle,
        tags: item.tags,
        category: item.category,
      };
    }
    return {
      type: "document",
      id: item.documentId,
      title: item.documentTitle,
      tags: item.tags,
      category: item.category,
    };
  };

  return (
    <div className="h-full flex flex-col bg-cream">
      <div className="border-b border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {queueMode === "reading" ? "Reading Queue" : "Review Queue"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {queueMode === "reading"
                ? "Imported books, articles, and RSS feeds scheduled for incremental reading"
                : "Flashcards and learning items scheduled for review"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartOptimalSession}
              className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 flex items-center gap-2"
              style={{ color: 'var(--color-primary-foreground, white)' }}
            >
              <Play className="w-4 h-4" />
              Start Optimal Session
            </button>
            {queueMode === "reading" && onOpenScrollMode && (
              <button
                onClick={onOpenScrollMode}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:opacity-90 flex items-center gap-2"
                title="TikTok-style vertical scrolling through documents"
              >
                <Smartphone className="w-4 h-4" />
                Scroll Mode
              </button>
            )}
            <button
              onClick={() => setCustomizeModalOpen(true)}
              className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
            >
              Customize Session
            </button>
            <button className="px-4 py-2 bg-background border border-border rounded-md hover:bg-muted/60 text-foreground">
              Manual Browse
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/60 rounded-md p-1">
            <button
              onClick={() => setQueueMode("reading")}
              className={`px-3 py-1 text-sm rounded ${
                queueMode === "reading" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Reading Queue
            </button>
            <button
              onClick={() => setQueueMode("review")}
              className={`px-3 py-1 text-sm rounded ${
                queueMode === "review" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Review Queue
            </button>
          </div>
          <div className="flex-1 min-w-[220px] relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tags, titles, or focus areas"
              className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          {queueMode === "reading" && (
            <div className="flex items-center gap-1 bg-muted/60 rounded-md p-1">
              <button
                onClick={() => setQueueFilterMode("due-today")}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 ${
                  queueFilterMode === "due-today" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Documents scheduled for today (FSRS)"
              >
                <Clock className="w-3 h-3" />
                Due Today
              </button>
              <button
                onClick={() => setQueueFilterMode("all-items")}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 ${
                  queueFilterMode === "all-items" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="All documents in your library"
              >
                <LayoutList className="w-3 h-3" />
                All Items
              </button>
              <button
                onClick={() => setQueueFilterMode("new-only")}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 ${
                  queueFilterMode === "new-only" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Documents that have never been read"
              >
                <Sparkles className="w-3 h-3" />
                New Only
              </button>
              <button
                onClick={() => setQueueFilterMode("due-all")}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 ${
                  queueFilterMode === "due-all" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="All due items (documents, extracts, flashcards)"
              >
                <Target className="w-3 h-3" />
                Due All
              </button>
            </div>
          )}
          <select
            value={preset}
            onChange={(event) => setPreset(event.target.value as PriorityPreset)}
            className="px-3 py-2 bg-background border border-border rounded-md text-sm"
          >
            <option value="maximize-retention">Maximize Retention</option>
            <option value="minimize-time">Minimize Daily Time</option>
            <option value="aggressive-catchup">Aggressive Catch-Up</option>
            <option value="exploratory">Exploratory Learning</option>
            <option value="project-focused">Project-Focused</option>
          </select>
          <button
            onClick={() => setInspectorOpen((prev) => !prev)}
            className="px-3 py-2 bg-muted text-foreground rounded-md text-sm hover:bg-muted/80"
          >
            {isInspectorOpen ? "Hide Inspector" : "Show Inspector"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
              {error}
            </div>
          )}

          {bulkOperationResult && (
            <div className="p-3 bg-muted border border-border rounded-lg text-sm text-foreground flex items-center justify-between">
              <span>
                Bulk update: {bulkOperationResult.succeeded.length} succeeded, {bulkOperationResult.failed.length} failed
              </span>
              <button
                onClick={clearBulkResult}
                className="px-2 py-1 text-xs bg-background border border-border rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <span className="text-sm text-primary">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkSuspend}
                  disabled={bulkOperationLoading}
                  className="px-3 py-1.5 bg-background border border-border rounded text-sm"
                >
                  Suspend
                </button>
                <button
                  onClick={handleBulkUnsuspend}
                  disabled={bulkOperationLoading}
                  className="px-3 py-1.5 bg-background border border-border rounded text-sm"
                >
                  Unsuspend
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkOperationLoading}
                  className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading queue...</div>
          ) : visibleItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {queueMode === "reading"
                ? "No documents in the reading queue. Import books, articles, or RSS feeds to get started."
                : "No learning items scheduled for review."}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {sessionBlocks.map((block) => (
                  <div key={block.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-semibold text-foreground">{block.title}</h2>
                      <span className="text-xs text-muted-foreground">
                        {block.timeBudgetMinutes} min
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Safe stop after item {block.safeStopCount}
                    </div>
                    <div className="space-y-2">
                      {block.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="text-foreground">•</span>
                          <span className="line-clamp-1">{item.documentTitle}</span>
                        </div>
                      ))}
                      {block.items.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{block.items.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Session estimate: {formatMinutesRange(getTimeEstimateRange(visibleItems[0]))} per item
                </span>
                <span>•</span>
                <span>Press J/K to navigate, Enter to open, I to toggle inspector</span>
              </div>

              <div className="space-y-3">
                {selectableItems.length > 0 && queueMode === "review" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={allSelected} onChange={handleToggleSelectAll} />
                      Select all learning items
                    </label>
                  </div>
                )}
                {visibleItems.map((item) => {
                  const isExpanded = expandedIds.has(item.id);
                  const status = getQueueStatus(item);
                  const priorityVector = getPriorityVector(item);
                  const estimateRange = getTimeEstimateRange(item);
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg bg-card transition-colors ${
                        item.id === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div
                        onClick={() => setSelectedId(item.id)}
                        className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.itemType === "learning-item" && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={(event) => {
                                event.stopPropagation();
                                setSelected(item.id, !selectedIds.has(item.id));
                              }}
                            />
                          )}
                          <StatusPill status={status} />
                          {item.itemType === "document" && (() => {
                            const fsrsInfo = getFsrsSchedulingInfo(item);
                            return (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-300"
                                title={`Next review: ${fsrsInfo.nextReviewDate ? fsrsInfo.nextReviewDate.toLocaleDateString() : 'Not scheduled'}`}
                              >
                                <Clock className="w-3 h-3 inline mr-1" />
                                {fsrsInfo.statusLabel}
                              </span>
                            );
                          })()}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground line-clamp-1">
                              {item.documentTitle}
                            </div>
                          <div className="text-xs text-muted-foreground">
                            {formatMinutesRange(estimateRange)} • Priority {getPriorityScore(item, preset)}
                          </div>
                          <TimeConfidenceBar min={estimateRange.min} max={estimateRange.max} />
                        </div>
                      </div>
                        <div className="flex items-center gap-3">
                          <PriorityGlyph vector={priorityVector} />
                          <ItemDetailsPopover
                            target={buildDetailsTarget(item)}
                            renderTrigger={({ onClick, isOpen }) => (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onClick();
                                }}
                                className={`p-2 rounded-md border border-border bg-background hover:bg-muted/60 ${
                                  isOpen ? "text-foreground" : "text-muted-foreground"
                                }`}
                                title="Item details"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            )}
                          />
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExpanded(item.id);
                            }}
                            className="p-2 bg-muted rounded-md text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground space-y-2">
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-4 h-4" />
                            <span>
                              Stability {getFsrsMetrics(item).stability} • Difficulty {getFsrsMetrics(item).difficulty} • Retrievability{" "}
                              {Math.round(getFsrsMetrics(item).retrievability * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Target className="w-4 h-4" />
                            <span>
                              Next interval: {getFsrsMetrics(item).nextIntervalDays} days • Impact: {getReadingImpact(item)}
                            </span>
                          </div>
                          {status === "drifted" && (
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <AlertTriangle className="w-4 h-4" />
                              <span>
                                Drifted state: reschedule, compress intervals, or downgrade frequency.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {isInspectorOpen && (
          <aside className="w-80 border-l border-border bg-card p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
              <button
                onClick={() => setInspectorOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
            {!selectedItem ? (
              <div className="text-sm text-muted-foreground">Select an item to inspect.</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Title</div>
                  <div className="text-sm font-semibold text-foreground">{selectedItem.documentTitle}</div>
                  <div className="text-xs text-muted-foreground mt-1">{selectedItem.itemType}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Scheduling rationale</div>
                  <div className="text-xs text-muted-foreground">
                    Priority {getPriorityScore(selectedItem, preset)} • {getStatusLabel(getQueueStatus(selectedItem))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">FSRS Snapshot</div>
                  <div className="text-xs text-muted-foreground">
                    Stability {getFsrsMetrics(selectedItem).stability} • Difficulty {getFsrsMetrics(selectedItem).difficulty} • Retrievability{" "}
                    {Math.round(getFsrsMetrics(selectedItem).retrievability * 100)}%
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Next interval</div>
                  <div className="text-sm font-semibold text-foreground">
                    {getFsrsMetrics(selectedItem).nextIntervalDays} days
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Conversion pathway</div>
                  <div className="text-xs text-muted-foreground">
                    Reading → Extract → Cloze → Review
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Impact: {getReadingImpact(selectedItem)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Recovery actions</div>
                  <div className="flex flex-col gap-2">
                    <button className="px-3 py-2 bg-background border border-border rounded text-sm text-foreground">
                      Compress intervals
                    </button>
                    <button className="px-3 py-2 bg-background border border-border rounded text-sm text-foreground">
                      Reschedule intelligently
                    </button>
                    <button className="px-3 py-2 bg-background border border-border rounded text-sm text-foreground">
                      Downgrade frequency
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="px-3 py-2 bg-muted rounded text-sm flex items-center gap-2 text-foreground"
                  >
                    <Keyboard className="w-4 h-4" />
                    {showAdvanced ? "Hide advanced" : "Show advanced"}
                  </button>
                  {showAdvanced && (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div>Raw FSRS values</div>
                      <div>Override scheduling</div>
                      <button
                        onClick={() => setShowRawJson((prev) => !prev)}
                        className="px-3 py-1 bg-background border border-border rounded"
                      >
                        {showRawJson ? "Hide JSON" : "Show JSON"}
                      </button>
                      {showRawJson && (
                        <pre className="text-[10px] whitespace-pre-wrap bg-background border border-border rounded p-2">
{JSON.stringify(selectedItem, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      <SessionCustomizeModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
        customization={sessionCustomization}
        onChange={setSessionCustomization}
        onApply={() => setCustomizeModalOpen(false)}
        availableTags={Array.from(new Set(items.flatMap((item) => item.tags || [])))}
        availableCategories={Array.from(new Set(items.map((item) => item.category).filter(Boolean)))}
      />
    </div>
  );
}

function PriorityGlyph({ vector }: { vector: ReturnType<typeof getPriorityVector> }) {
  const tooltip = `Retention ${vector.retentionRisk} • Load ${vector.cognitiveLoad} • Time ${vector.timeEfficiency} • Intent ${vector.userIntent} • Overdue ${vector.overduePenalty}`;
  return (
    <div className="flex items-center gap-1" title={tooltip}>
      <div className="h-2 w-20 bg-muted/60 rounded-full overflow-hidden flex">
        <div className="h-full bg-red-500/50" style={{ width: `${vector.retentionRisk / 5}%` }} />
        <div className="h-full bg-amber-500/50" style={{ width: `${vector.cognitiveLoad / 5}%` }} />
        <div className="h-full bg-emerald-500/50" style={{ width: `${vector.timeEfficiency / 5}%` }} />
        <div className="h-full bg-blue-500/50" style={{ width: `${vector.userIntent / 5}%` }} />
        <div className="h-full bg-slate-500/50" style={{ width: `${vector.overduePenalty / 5}%` }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof getQueueStatus> }) {
  const label = getStatusLabel(status);
  const styles =
    status === "drifted"
      ? "bg-slate-500/15 text-slate-200 dark:text-slate-300"
      : status === "due-overdue"
      ? "bg-red-500/15 text-red-600 dark:text-red-300"
      : status === "due"
      ? "bg-orange-500/15 text-orange-600 dark:text-orange-300"
      : status === "scheduled"
      ? "bg-blue-500/15 text-blue-600 dark:text-blue-300"
      : status === "review"
      ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
      : status === "learning"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles}`}>{label}</span>
  );
}

function TimeConfidenceBar({ min, max }: { min: number; max: number }) {
  const width = Math.min(100, Math.max(10, Math.round((min / Math.max(max, 1)) * 100)));
  return (
    <div className="mt-1 h-1.5 w-24 bg-muted/60 rounded-full overflow-hidden">
      <div className="h-full bg-primary/50" style={{ width: `${width}%` }} />
    </div>
  );
}
