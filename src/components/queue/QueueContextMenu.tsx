import { useState } from "react";
import { MoreVertical, Pause, Play, Trash2, Calendar } from "lucide-react";
import type { QueueItem } from "../../types/queue";

interface QueueContextMenuProps {
  item: QueueItem;
  onPostpone: (id: string, days: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStartReview: (item: QueueItem) => void;
}

export function QueueContextMenu({ item, onPostpone, onDelete, onStartReview }: QueueContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPostponeDialog, setShowPostponeDialog] = useState(false);

  const handlePostpone = async (days: number) => {
    try {
      await onPostpone(item.id, days);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to postpone item:", error);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${item.documentTitle}"?`)) {
      try {
        await onDelete(item.id);
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="More options"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 w-48 bg-card border border-border rounded-lg shadow-lg py-1">
              <button
                onClick={() => {
                  onStartReview(item);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Review
              </button>

              {item.itemType === "learning-item" && (
                <>
                  <button
                    onClick={() => {
                      setShowPostponeDialog(true);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Postpone...
                  </button>

                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showPostponeDialog && item.itemType === "learning-item" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Postpone Item
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select how many days to postpone this item
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      handlePostpone(days);
                      setShowPostponeDialog(false);
                    }}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
                  >
                    {days} day{days !== 1 ? "s" : ""}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowPostponeDialog(false)}
                  className="px-4 py-2 bg-card border border-border text-foreground rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
