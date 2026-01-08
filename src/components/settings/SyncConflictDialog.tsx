/**
 * Sync Conflict Dialog Component
 * Displays sync conflicts and allows user to resolve them
 */

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  X,
  Check,
  ArrowRight,
  FileText,
  Calendar,
  Monitor,
  Cloud,
} from "lucide-react";
import type { SyncConflict, ConflictResolution } from "@/types/cloud";

interface SyncConflictDialogProps {
  conflicts: SyncConflict[];
  open: boolean;
  onClose: () => void;
  onResolveComplete?: () => void;
}

const RESOLUTION_OPTIONS: {
  value: ConflictResolution;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "keep-local",
    label: "Keep Local",
    description: "Use your local version and overwrite the remote",
    icon: <Monitor className="w-4 h-4" />,
  },
  {
    value: "keep-remote",
    label: "Keep Remote",
    description: "Use the cloud version and overwrite your local data",
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    value: "keep-newest",
    label: "Keep Newest",
    description: "Automatically keep whichever version was modified more recently",
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    value: "keep-both",
    label: "Keep Both",
    description: "Create a duplicate so you don't lose either version",
    icon: <FileText className="w-4 h-4" />,
  },
];

export function SyncConflictDialog({
  conflicts,
  open,
  onClose,
  onResolveComplete,
}: SyncConflictDialogProps) {
  const [resolutions, setResolutions] = useState<Map<number, ConflictResolution>>(
    new Map()
  );
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!open) return null;

  const handleResolutionChange = (index: number, resolution: ConflictResolution) => {
    setResolutions((prev) => new Map(prev).set(index, resolution));
  };

  const handleApplyAll = (resolution: ConflictResolution) => {
    const newResolutions = new Map<number, ConflictResolution>();
    conflicts.forEach((_, index) => {
      newResolutions.set(index, resolution);
    });
    setResolutions(newResolutions);
  };

  const handleResolveConflicts = async () => {
    setApplying(true);

    try {
      // Convert Map to array
      const resolutionArray = conflicts.map((_, index) =>
        resolutions.get(index) || "keep-newest"
      );

      await invoke("cloud_sync_resolve_conflicts", {
        resolutions: resolutionArray,
      });

      setApplied(true);
      onResolveComplete?.();

      // Close dialog after showing success
      setTimeout(() => {
        onClose();
        setApplied(false);
        setResolutions(new Map());
      }, 1500);
    } catch (err) {
      console.error("Failed to resolve conflicts:", err);
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const allResolved = conflicts.every((_, index) => resolutions.has(index));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Sync Conflicts Detected
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} found. Choose how to resolve each one.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={applying || applied}
              className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Apply All Buttons */}
        {!applied && (
          <div className="px-6 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Apply to all:</span>
              {RESOLUTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleApplyAll(option.value)}
                  disabled={applying}
                  className="px-2 py-1 text-xs bg-background hover:bg-muted border border-border rounded transition-colors disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {applied ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-full mb-3">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-foreground font-medium">Conflicts resolved!</p>
              <p className="text-sm text-muted-foreground">
                Your data has been synchronized.
              </p>
            </div>
          ) : (
            conflicts.map((conflict, index) => {
              const resolution = resolutions.get(index);
              const isNewerLocal =
                new Date(conflict.local_modified) >
                new Date(conflict.remote_modified);

              return (
                <div
                  key={conflict.item_id}
                  className="p-4 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {conflict.item_type}: {conflict.item_id.slice(0, 8)}...
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Modified on both devices
                      </div>
                    </div>
                    {isNewerLocal && (
                      <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded">
                        Local is newer
                      </span>
                    )}
                  </div>

                  {/* Version Comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Monitor className="w-3 h-3" />
                        Your Version
                      </div>
                      <div className="text-sm text-foreground">
                        {formatDate(conflict.local_modified)}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Cloud className="w-3 h-3" />
                        Cloud Version
                      </div>
                      <div className="text-sm text-foreground">
                        {formatDate(conflict.remote_modified)}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Options */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {RESOLUTION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleResolutionChange(index, option.value)}
                        disabled={applying}
                        className={`p-3 border-2 rounded-lg transition-all text-left ${
                          resolution === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={
                              resolution === option.value
                                ? "text-primary"
                                : "text-muted-foreground"
                            }
                          >
                            {option.icon}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {option.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {!applied && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {resolutions.size} of {conflicts.length} resolved
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={applying}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveConflicts}
                  disabled={!allResolved || applying}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {applying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Apply Resolutions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
