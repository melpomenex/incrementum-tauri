import { useState, useEffect } from "react";
import { Search, Filter, ArrowUpDown, Play, Square, CheckSquare, Download } from "lucide-react";
import { useQueueStore } from "../../stores";
import { useTabsStore } from "../../stores";
import { QueueStatsDisplay } from "../../components/queue/QueueStats";
import { BulkActionBar } from "../../components/queue/BulkActionBar";
import { QueueContextMenu } from "../../components/queue/QueueContextMenu";
import { ExportQueueDialog } from "../../components/queue/ExportQueueDialog";
import { DynamicVirtualList } from "../../components/common/VirtualList";
import type { QueueItem } from "../../types/queue";
import { ReviewTab, DocumentViewer, DocumentsTab } from "./TabRegistry";

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

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [loadQueue, loadStats]);

  useEffect(() => {
    // Update allSelected state based on selection
    setAllSelected(
      filteredItems.length > 0 && selectedIds.size === filteredItems.length
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
    if (priority >= 8) return "text-red-500";
    if (priority >= 5) return "text-yellow-500";
    return "text-green-500";
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
          <DynamicVirtualList
            items={filteredItems}
            renderItem={(item) => (
              <div
                className={`p-4 mb-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow ${
                  selectedIds.has(item.id) ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => setSelected(item.id, !selectedIds.has(item.id))}
                    className="pt-1"
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
            estimateSize={200}
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
