/**
 * useUndoRedo Hook
 * Provides undo/redo functionality for components
 */

import { useCallback, useEffect } from "react";
import { useUndoRedoStore } from "../stores/undoRedoStore";
import { useToast } from "../components/common/Toast";
import { useKeyboardShortcuts, ShortcutGroup } from "./useKeyboardShortcuts";
import { UndoableCommand } from "../stores/undoRedoStore";

/**
 * Undo/Redo hook
 */
export function useUndoRedo() {
  const { executeCommand, undo, redo, canUndo, canRedo, getUndoDescription, getRedoDescription } =
    useUndoRedoStore();
  const { success, error } = useToast();

  /**
   * Execute an undoable command
   */
  const execute = useCallback(
    async (command: UndoableCommand) => {
      try {
        await executeCommand(command);

        // Show success toast with undo button
        success(command.description, undefined, {
          duration: 8000,
          action: {
            label: "Undo",
            onClick: () => {
              undo().catch((err) => {
                error("Failed to undo", err?.message || "Unknown error");
              });
            },
          },
        });
      } catch (err) {
        error("Operation failed", (err as Error)?.message || "Unknown error");
        throw err;
      }
    },
    [executeCommand, undo, success, error]
  );

  /**
   * Undo last operation
   */
  const undoOperation = useCallback(async () => {
    try {
      await undo();
      const description = getUndoDescription();
      success(`Undid: ${description || "operation"}`);
    } catch (err) {
      error("Failed to undo", (err as Error)?.message || "Unknown error");
      throw err;
    }
  }, [undo, getUndoDescription, success, error]);

  /**
   * Redo last undone operation
   */
  const redoOperation = useCallback(async () => {
    try {
      await redo();
      const description = getRedoDescription();
      success(`Redid: ${description || "operation"}`);
    } catch (err) {
      error("Failed to redo", (err as Error)?.message || "Unknown error");
      throw err;
    }
  }, [redo, getRedoDescription, success, error]);

  /**
   * Keyboard shortcuts for undo/redo
   */
  const shortcuts: ShortcutGroup[] = [
    {
      name: "Undo/Redo",
      shortcuts: [
        {
          key: "z",
          ctrlKey: true,
          metaKey: true,
          description: "Undo",
          handler: () => {
            if (canUndo()) {
              undoOperation();
            }
          },
        },
        {
          key: "z",
          ctrlKey: true,
          metaKey: true,
          shiftKey: true,
          description: "Redo",
          handler: () => {
            if (canRedo()) {
              redoOperation();
            }
          },
        },
        {
          key: "y",
          ctrlKey: true,
          metaKey: true,
          description: "Redo (alternative)",
          handler: () => {
            if (canRedo()) {
              redoOperation();
            }
          },
        },
      ],
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return {
    execute,
    undo: undoOperation,
    redo: redoOperation,
    canUndo,
    canRedo,
    getUndoDescription,
    getRedoDescription,
  };
}

/**
 * Higher-order function to wrap delete operations with undo
 */
export function withUndo<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  commandFactory: (...args: Parameters<T>) => UndoableCommand
): T {
  return (async (...args: Parameters<T>) => {
    const command = commandFactory(...args);
    const { execute } = useUndoRedoStore.getState();

    try {
      await command.execute();
      await execute(command);
      return await operation(...args);
    } catch (err) {
      throw err;
    }
  }) as T;
}
