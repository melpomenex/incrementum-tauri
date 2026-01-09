import { useState, useEffect } from "react";
import { Search, Filter, ArrowUpDown, Play, Square, CheckSquare, Download } from "lucide-react";
import { useQueueStore } from "../../stores";
import { useTabsStore } from "../../stores";
import { QueueStatsDisplay } from "../../components/queue/QueueStats";
import { BulkActionBar } from "../../components/queue/BulkActionBar";
import { QueueContextMenu } from "../../components/queue/QueueContextMenu";
import { ExportQueueDialog } from "../../components/queue/ExportQueueDialog";
import { VirtualList } from "../../components/common/VirtualList";
import type { QueueItem } from "../../types/queue";
import { ReviewTab, DocumentViewer, DocumentsTab } from "./TabRegistry";
import { updateDocumentPriority } from "../../api/documents";

export function QueueTab() {
  const { addTab } = useTabsStore();
  const {
    filteredItems,
    stats,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortOptions,
    setSortOptions,
    loadQueue,
    loadStats,
    selectedIds,
    setSelected,
    selectAll,
    clearSelection,
    postponeItem,
    bulkSuspend,
    bulkUnsuspend,
    bulkDelete,
    bulkOperationLoading,
    bulkOperationResult,
    clearBulkResult,
  } = useQueueStore();

  const [showFilters, setShowFilters] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, { rating?: number; slider?: number }>>({});
  const [priorityUpdatingIds, setPriorityUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [loadQueue, loadStats]);

  useEffect(() => {
    // Update allSelected state based on selection
    const selectableCount = filteredItems.filter(
      (item) => item.itemType === "learning-item"
    ).length;
    setAllSelected(
      selectableCount > 0 && selectedIds.size === selectableCount
    );
  }, [selectedIds, filteredItems]);

  const handleToggleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  const handleStartReview = (item: QueueItem) => {
    if (item.itemType === "learning-item") {
      addTab({
        title: "Review",
        icon: "🎴",
        type: "review",
        content: ReviewTab,
        closable: true,
      });
    } else {
      addTab({
        title: item.documentTitle,
        icon: "📄",
        type: "document-viewer",
        content: DocumentViewer,
        closable: true,
        data: { documentId: item.documentId },
      });
    }
  };

  const handlePostponeItem = async (id: string, days: number) => {
    await postponeItem(id, days);
  };

  const handleDeleteItem = async (id: string) => {
    // For single item delete, we'll need to implement this
    // For now, select the item and use bulk delete
    setSelected(id, true);
    await bulkDelete();
  };

  const getItemIcon = (itemType: QueueItem["itemType"]) => {
    switch (itemType) {
      case "document":
        return "📄";
      case "extract":
        return "📝";
      case "learning-item":
        return "🧠";
      default:
        return "📚";
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority > 10) {
      if (priority >= 80) return "text-red-500";
      if (priority >= 50) return "text-yellow-500";
      return "text-green-500";
    }
    if (priority >= 8) return "text-red-500";
    if (priority >= 5) return "text-yellow-500";
    return "text-green-500";
  };

  const getDraftPriority = (item: QueueItem) => {
    const draft = priorityDrafts[item.id];
    return {
      rating: draft?.rating ?? item.priorityRating ?? 0,
      slider: draft?.slider ?? item.prioritySlider ?? 0,
    };
  };

  const updateDocumentQueuePriority = async (
    item: QueueItem,
    rating: number,
    slider: number
  ) => {
    if (item.itemType !== "document") return;

    setPriorityUpdatingIds((prev) => new Set(prev).add(item.id));
    try {
      await updateDocumentPriority(item.documentId, rating, slider);
      await loadQueue();
      setPriorityDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (error) {
      console.error("Failed to update document priority:", error);
    } finally {
      setPriorityUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const daysUntilDue = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return "Overdue";
    if (daysUntilDue === 0) return "Today";
    if (daysUntilDue === 1) return "Tomorrow";
    if (daysUntilDue <= 7) return `In ${daysUntilDue} days`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reading Queue</h1>
        <p className="text-muted-foreground">
          Manage your incremental reading queue ({filteredItems.length} items)
        </p>
      </div>

      {/* Statistics */}
      <QueueStatsDisplay stats={stats} isLoading={isLoading} />

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 bg-card border border-border rounded-md hover:bg-muted transition-colors"
          title="Toggle filters"
        >
          <Filter className="w-4 h-4" />
        </button>

        <button
          onClick={() =>
            setSortOptions({
              field: sortOptions.field === "priority" ? "title" : "priority",
              direction: sortOptions.direction === "asc" ? "desc" : "asc",
            })
          }
          className="p-2 bg-card border border-border rounded-md hover:bg-muted transition-colors"
          title={`Sort by ${sortOptions.field === "priority" ? "title" : "priority"} (${sortOptions.direction})`}
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowExportDialog(true)}
          className="p-2 bg-card border border-border rounded-md hover:bg-muted transition-colors"
          title="Export queue"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => addTab({
            title: "Review",
            icon: "🎴",
            type: "review",
            content: ReviewTab,
            closable: true,
          })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Start Review
        </button>
      </div>

      {/* Bulk Operation Result */}
      {bulkOperationResult && (
        <div className={`p-4 border rounded-lg ${
          bulkOperationResult.failed.length === 0
            ? "bg-green-500/10 border-green-500 text-green-500"
            : "bg-yellow-500/10 border-yellow-500 text-yellow-500"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {bulkOperationResult.succeeded.length} succeeded
                {bulkOperationResult.failed.length > 0 && (
                  <>, {bulkOperationResult.failed.length} failed</>
                )}
              </p>
              {bulkOperationResult.failed.length > 0 && (
                <div className="text-sm mt-1">
                  {bulkOperationResult.errors.join(", ")}
                </div>
              )}
            </div>
            <button
              onClick={clearBulkResult}
              className="p-1 hover:bg-black/10 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        isLoading={bulkOperationLoading}
        onSuspend={bulkSuspend}
        onUnsuspend={bulkUnsuspend}
        onDelete={bulkDelete}
        onClearSelection={clearSelection}
      />

      {/* Queue Items */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading queue...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? "No items match your search" : "Your queue is empty"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "Import documents to start your incremental reading journey"}
          </p>
          {!searchQuery && (
            <button
              onClick={() => addTab({
                title: "Documents",
                icon: "📄",
                type: "documents",
                content: DocumentsTab,
                closable: true,
              })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Import Documents
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All Header */}
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <button
              onClick={handleToggleSelectAll}
              className="p-2 hover:bg-muted rounded transition-colors"
              title={allSelected ? "Deselect all" : "Select all"}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <span className="text-sm text-muted-foreground">
              {allSelected ? "All selected" : "Select all"}
            </span>
          </div>

          {/* Virtual Scrolled Items List */}
          <VirtualList
            items={filteredItems}
            itemHeight={240}
            renderItem={(item, index) => (
              <div
                className={`p-4 mb-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow ${
                  selectedIds.has(item.id) ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => {
                      if (item.itemType === "learning-item") {
                        setSelected(item.id, !selectedIds.has(item.id));
                      }
                    }}
                    disabled={item.itemType !== "learning-item"}
                    className={`pt-1 ${item.itemType !== "learning-item" ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={
                      item.itemType !== "learning-item"
                        ? "Selection is available for learning items only"
                        : "Select item"
                    }
                  >
                    {selectedIds.has(item.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0">{getItemIcon(item.itemType)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1 truncate">
                          {item.documentTitle}
                        </h3>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {item.category && (
                            <span className="inline-block px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                              {item.category}
                            </span>
                          )}
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.dueDate && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              {formatDate(item.dueDate)}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{item.progress}%</span>
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className={`text-lg font-bold ${getPriorityColor(item.priority)}`}>
                          {item.priority.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Priority</div>
                      </div>
                    </div>

                    {item.itemType === "document" && (
                      <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Rating
                            </div>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4].map((rating) => {
                                const isActive = getDraftPriority(item).rating === rating;
                                const isUpdating = priorityUpdatingIds.has(item.id);
                                return (
                                  <button
                                    key={rating}
                                    onClick={() => {
                                      setPriorityDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          rating,
                                        },
                                      }));
                                      const slider = getDraftPriority(item).slider;
                                      void updateDocumentQueuePriority(item, rating, slider);
                                    }}
                                    disabled={isUpdating}
                                    className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                                      isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background text-foreground border border-border"
                                    } ${isUpdating ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/10"}`}
                                    title={`Rate ${rating}`}
                                  >
                                    {rating}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <span>Priority slider</span>
                              <span>{getDraftPriority(item).slider}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={getDraftPriority(item).slider}
                              onChange={(event) => {
                                const slider = Number(event.target.value);
                                setPriorityDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    slider,
                                  },
                                }));
                              }}
                              onMouseUp={(event) => {
                                const slider = Number((event.target as HTMLInputElement).value);
                                const rating = getDraftPriority(item).rating;
                                void updateDocumentQueuePriority(item, rating, slider);
                              }}
                              onTouchEnd={(event) => {
                                const slider = Number((event.target as HTMLInputElement).value);
                                const rating = getDraftPriority(item).rating;
                                void updateDocumentQueuePriority(item, rating, slider);
                              }}
                              disabled={priorityUpdatingIds.has(item.id)}
                              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        {item.estimatedTime > 0 && (
                          <span>⏱️ {item.estimatedTime} min</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartReview(item)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5 text-sm"
                          title="Start"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start
                        </button>

                        <QueueContextMenu
                          item={item}
                          onPostpone={handlePostponeItem}
                          onDelete={handleDeleteItem}
                          onStartReview={handleStartReview}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            className="max-h-[60vh]"
          />
        </div>
      )}

      {/* Export Dialog */}
      <ExportQueueDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  );
}
