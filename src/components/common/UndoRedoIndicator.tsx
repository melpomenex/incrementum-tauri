/**
 * Undo/Redo Indicator Component
 * Shows current undo/redo state with buttons
 */

import { useUndoRedo } from "../../hooks/useUndoRedo";
import { Undo, Redo } from "lucide-react";

export function UndoRedoIndicator() {
  const { canUndo, canRedo, getUndoDescription, getRedoDescription } = useUndoRedo();

  const undoDesc = getUndoDescription();
  const redoDesc = getRedoDescription();

  if (!canUndo() && !canRedo()) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-md">
      {/* Undo Button */}
      <button
        onClick={() => {
          // The keyboard shortcut hook handles the actual undo
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, metaKey: true }));
        }}
        disabled={!canUndo()}
        className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title={`Undo${undoDesc ? `: ${undoDesc}` : ""} (Ctrl+Z / Cmd+Z)`}
      >
        <Undo className="w-4 h-4" />
      </button>

      {/* Redo Button */}
      <button
        onClick={() => {
          // The keyboard shortcut hook handles the actual redo
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true, metaKey: true }));
        }}
        disabled={!canRedo()}
        className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title={`Redo${redoDesc ? `: ${redoDesc}` : ""} (Ctrl+Y / Cmd+Y)`}
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Compact UndoRedo indicator for status bars
 */
export function UndoRedoStatusIndicator() {
  const { canUndo, canRedo } = useUndoRedo();

  if (!canUndo() && !canRedo()) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {canUndo() && <span>• Undo available</span>}
      {canRedo() && <span>• Redo available</span>}
    </div>
  );
}
