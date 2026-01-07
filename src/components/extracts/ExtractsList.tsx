import { useState, useEffect } from "react";
import { Trash2, Edit, Tag, Calendar, FileText, Sparkles, Loader2, CheckSquare, Square, X } from "lucide-react";
import { getExtracts, type Extract } from "../../api/extracts";
import { generateLearningItemsFromExtract } from "../../api/learning-items";
import { bulkDeleteExtracts, bulkGenerateCards } from "../../api/extract-bulk";
import { cn } from "../../utils";
import { EditExtractDialog } from "./EditExtractDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface ExtractsListProps {
  documentId: string;
}

export function ExtractsList({ documentId }: ExtractsListProps) {
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generatedCounts, setGeneratedCounts] = useState<Record<string, number>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [bulkOperationResult, setBulkOperationResult] = useState<{
    succeeded: string[];
    failed: string[];
    errors: string[];
  } | null>(null);

  // Dialog states
  const [editingExtract, setEditingExtract] = useState<Extract | null>(null);
  const [deletingExtract, setDeletingExtract] = useState<Extract | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const loadExtracts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getExtracts(documentId);
        setExtracts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load extracts");
      } finally {
        setIsLoading(false);
      }
    };

    loadExtracts();
  }, [documentId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getColorClass = (color?: string) => {
    if (!color) return "bg-transparent";
    // Map color names to Tailwind classes
    const colorMap: Record<string, string> = {
      "bg-red-500": "bg-red-500",
      "bg-orange-500": "bg-orange-500",
      "bg-yellow-500": "bg-yellow-500",
      "bg-green-500": "bg-green-500",
      "bg-blue-500": "bg-blue-500",
      "bg-purple-500": "bg-purple-500",
    };
    return colorMap[color] || "bg-transparent";
  };

  const handleGenerateCards = async (extractId: string) => {
    setGeneratingIds(prev => new Set(prev).add(extractId));
    try {
      const items = await generateLearningItemsFromExtract(extractId);
      setGeneratedCounts(prev => ({ ...prev, [extractId]: items.length }));
      console.log(`Generated ${items.length} learning items from extract ${extractId}`);
    } catch (error) {
      console.error("Failed to generate learning items:", error);
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(extractId);
        return next;
      });
    }
  };

  const handleEdit = (extract: Extract) => {
    setEditingExtract(extract);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (extract: Extract) => {
    setDeletingExtract(extract);
    setIsDeleteDialogOpen(true);
  };

  const handleExtractUpdated = (updated: Extract) => {
    setExtracts(extracts.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleExtractDeleted = (deletedId: string) => {
    setExtracts(extracts.filter((e) => e.id !== deletedId));
    // Also remove from generated counts
    setGeneratedCounts((prev) => {
      const next = { ...prev };
      delete next[deletedId];
      return next;
    });
  };

  // Selection handlers
  const setSelected = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(extracts.map(e => e.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk operation handlers
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkOperationLoading(true);
    setBulkOperationResult(null);

    try {
      const result = await bulkDeleteExtracts(Array.from(selectedIds));
      setBulkOperationResult(result);

      // Remove successfully deleted extracts
      if (result.succeeded.length > 0) {
        setExtracts(extracts.filter(e => !result.succeeded.includes(e.id)));
        // Also remove from generated counts
        setGeneratedCounts(prev => {
          const next = { ...prev };
          result.succeeded.forEach(id => delete next[id]);
          return next;
        });
      }

      // Clear selection after operation
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete extracts:", error);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkGenerateCards = async () => {
    if (selectedIds.size === 0) return;
    setBulkOperationLoading(true);
    setBulkOperationResult(null);

    try {
      const result = await bulkGenerateCards(Array.from(selectedIds));
      setBulkOperationResult(result);

      // Update generated counts for successfully processed extracts
      if (result.succeeded.length > 0) {
        setGeneratedCounts(prev => {
          const next = { ...prev };
          result.succeeded.forEach(id => {
            next[id] = (next[id] || 0) + 1; // Assume 1 card per extract for now
          });
          return next;
        });
      }

      // Clear selection after operation
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to generate cards:", error);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading extracts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
        Failed to load extracts: {error}
      </div>
    );
  }

  if (extracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No extracts yet
        </h3>
        <p className="text-muted-foreground">
          Select text from the document to create your first extract
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          Extracts ({extracts.length})
        </h2>
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
              onClick={() => setBulkOperationResult(null)}
              className="p-1 hover:bg-black/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 p-3 bg-card border border-border rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} extract{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkGenerateCards}
                disabled={bulkOperationLoading}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 text-sm"
              >
                {bulkOperationLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Cards
                  </>
                )}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkOperationLoading}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 text-sm"
              >
                {bulkOperationLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select All Header */}
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
        <button
          onClick={selectedIds.size === extracts.length ? clearSelection : selectAll}
          className="p-2 hover:bg-muted rounded transition-colors"
          title={selectedIds.size === extracts.length ? "Deselect all" : "Select all"}
        >
          {selectedIds.size === extracts.length ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <span className="text-sm text-muted-foreground">
          {selectedIds.size === extracts.length ? "All selected" : "Select all"}
        </span>
      </div>

      <div className="grid gap-4">
        {extracts.map((extract) => (
          <div
            key={extract.id}
            className={cn(
              "p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow",
              selectedIds.has(extract.id) && "ring-2 ring-primary"
            )}
          >
            {/* Checkbox */}
            <button
              onClick={() => setSelected(extract.id, !selectedIds.has(extract.id))}
              className="float-left mr-3 mt-1"
              title={selectedIds.has(extract.id) ? "Deselect" : "Select"}
            >
              {selectedIds.has(extract.id) ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Color bar */}
            {extract.highlight_color && (
              <div
                className={cn(
                  "h-1 w-full rounded-t-lg mb-3",
                  getColorClass(extract.highlight_color)
                )}
              />
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                {extract.category && (
                  <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded mb-2">
                    {extract.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(extract)}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title="Edit extract"
                >
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(extract)}
                  className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                  title="Delete extract"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>

            {/* Content */}
            <p className="text-foreground mb-3 whitespace-pre-wrap">
              {extract.content}
            </p>

            {/* Notes */}
            {extract.notes && (
              <div className="mb-3 p-3 bg-muted rounded-md">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Notes
                </div>
                <p className="text-sm text-foreground">{extract.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                {extract.page_number && (
                  <span>Page {extract.page_number}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(extract.date_created)}
                </span>
              </div>

              {/* Tags */}
              {extract.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <div className="flex gap-1">
                    {extract.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-primary/10 text-primary rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Progressive Disclosure */}
            {extract.max_disclosure_level > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Disclosure level:
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: extract.max_disclosure_level }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-6 h-1.5 rounded-full",
                            i < extract.progressive_disclosure_level
                              ? "bg-primary"
                              : "bg-muted"
                          )}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Learning Items Section */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {generatedCounts[extract.id] ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {generatedCounts[extract.id]} card{generatedCounts[extract.id] !== 1 ? "s" : ""} generated
                    </span>
                  ) : (
                    <span>No cards generated yet</span>
                  )}
                </div>
                <button
                  onClick={() => handleGenerateCards(extract.id)}
                  disabled={generatingIds.has(extract.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5",
                    generatingIds.has(extract.id)
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {generatingIds.has(extract.id) ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Generate Cards
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dialogs */}
      {editingExtract && (
        <EditExtractDialog
          extract={editingExtract}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingExtract(null);
          }}
          onUpdate={handleExtractUpdated}
        />
      )}

      <DeleteConfirmDialog
        extract={deletingExtract}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingExtract(null);
        }}
        onDelete={handleExtractDeleted}
      />
    </div>
  );
}
