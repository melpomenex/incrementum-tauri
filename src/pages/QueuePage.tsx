import { useEffect, useState } from "react";
import { useQueueStore } from "../stores/queueStore";
import { invoke } from "@tauri-apps/api/core";
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  SkipForward,
  Search,
  Filter,
  Download,
  Trash2,
} from "lucide-react";

export function QueuePage() {
  const {
    filteredItems,
    stats,
    isLoading,
    loadQueue,
    loadStats,
    searchQuery,
    setSearchQuery,
    bulkSuspend,
    bulkDelete,
  } = useQueueStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [loadQueue, loadStats]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkSuspend = async () => {
    if (selectedIds.size === 0) return;
    await bulkSuspend(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} items?`)) {
      await bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "text-red-500";
    if (priority >= 5) return "text-yellow-500";
    return "text-green-500";
  };

  const formatDueDate = (dateString?: string) => {
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
    <div className="h-full flex flex-col bg-cream">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Learning Queue</h1>
            <p className="text-sm text-foreground-secondary">
              {stats?.due_today || 0} items due today
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90 flex items-center gap-2">
            <Play className="w-4 h-4" />
            Start Review
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-2 bg-background rounded">
            <div className="text-lg font-bold text-foreground">{stats?.total_items || 0}</div>
            <div className="text-xs text-foreground-secondary">Total</div>
          </div>
          <div className="text-center p-2 bg-background rounded">
            <div className="text-lg font-bold text-foreground">{stats?.due_today || 0}</div>
            <div className="text-xs text-foreground-secondary">Due Today</div>
          </div>
          <div className="text-center p-2 bg-background rounded">
            <div className="text-lg font-bold text-foreground">{stats?.new_items || 0}</div>
            <div className="text-xs text-foreground-secondary">New</div>
          </div>
          <div className="text-center p-2 bg-background rounded">
            <div className="text-lg font-bold text-foreground">{stats?.suspended || 0}</div>
            <div className="text-xs text-foreground-secondary">Suspended</div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-primary-50 border-b border-primary-200 flex items-center justify-between">
          <span className="text-sm text-primary-700">
            {selectedIds.size} items selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkSuspend}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm hover:bg-muted flex items-center gap-1"
            >
              <Pause className="w-3 h-3" />
              Suspend
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-sm hover:opacity-90 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Queue Items */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-foreground-secondary">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-foreground-secondary opacity-50" />
            <p className="text-foreground-secondary mb-2">Your queue is empty</p>
            <p className="text-sm text-foreground-secondary">
              Import documents and create extracts to build your queue
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="w-full p-3 bg-card border border-border rounded text-left flex items-center gap-3 hover:bg-muted transition-colors"
            >
              {selectedIds.size === filteredItems.length ? (
                <CheckCircle2 className="w-5 h-5 text-primary-500" />
              ) : (
                <XCircle className="w-5 h-5 text-foreground-secondary" />
              )}
              <span className="text-sm text-foreground">
                {selectedIds.size === filteredItems.length ? "Deselect All" : "Select All"}
              </span>
            </button>

            {/* Items */}
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-card border border-border rounded hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleSelect(item.id)}
                    className="mt-1"
                  >
                    {selectedIds.has(item.id) ? (
                      <CheckCircle2 className="w-5 h-5 text-primary-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-foreground-secondary" />
                    )}
                  </button>

                  {/* Icon */}
                  <div className="text-2xl">🧠</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      {item.documentTitle}
                    </h3>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 mb-2 text-xs text-foreground-secondary">
                      {item.category && (
                        <span className="px-2 py-0.5 bg-muted rounded">
                          {item.category}
                        </span>
                      )}
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDueDate(item.dueDate)}
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-300 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-foreground-secondary">
                        {item.progress}%
                      </span>
                      <span className={`text-sm font-bold ${getPriorityColor(item.priority)}`}>
                        {item.priority.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button className="px-3 py-1.5 bg-primary-300 text-white rounded text-xs hover:opacity-90 flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
