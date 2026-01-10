/**
 * Undo/Redo Store
 * Manages operation history for critical operations with undo/redo capability
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Operation types that support undo/redo
 */
export enum OperationType {
  DeleteDocument = "delete_document",
  DeleteExtract = "delete_extract",
  DeleteLearningItem = "delete_learning_item",
  BulkDeleteExtracts = "bulk_delete_extracts",
  BulkDeleteItems = "bulk_delete_items",
  UpdateReview = "update_review",
  UpdateSettings = "update_settings",
  CreateExtract = "create_extract",
  ArchiveDocument = "archive_document",
}

/**
 * Command interface for undoable operations
 */
export interface UndoableCommand {
  id: string;
  type: OperationType;
  description: string;
  timestamp: number;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

/**
 * Undo/Redo history state
 */
interface UndoRedoState {
  // History stacks
  undoStack: UndoableCommand[];
  redoStack: UndoableCommand[];

  // Maximum history size
  maxHistorySize: number;

  // Actions
  executeCommand: (command: UndoableCommand) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

/**
 * Create the undo/redo store
 */
export const useUndoRedoStore = create<UndoRedoState>()(
  persist(
    (set, get) => ({
      undoStack: [],
      redoStack: [],
      maxHistorySize: 50,

      executeCommand: async (command: UndoableCommand) => {
        try {
          // Execute the command
          await command.execute();

          // Add to undo stack
          const newUndoStack = [...get().undoStack, command];

          // Limit stack size
          if (newUndoStack.length > get().maxHistorySize) {
            newUndoStack.shift();
          }

          // Clear redo stack when new command is executed
          set({
            undoStack: newUndoStack,
            redoStack: [],
          });
        } catch (error) {
          console.error("Failed to execute command:", error);
          throw error;
        }
      },

      undo: async () => {
        const state = get();
        if (!state.canUndo()) {
          return;
        }

        const command = state.undoStack[state.undoStack.length - 1];

        try {
          await command.undo();

          // Move from undo stack to redo stack
          set({
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, command],
          });
        } catch (error) {
          console.error("Failed to undo command:", error);
          throw error;
        }
      },

      redo: async () => {
        const state = get();
        if (!state.canRedo()) {
          return;
        }

        const command = state.redoStack[state.redoStack.length - 1];

        try {
          await command.redo();

          // Move from redo stack to undo stack
          set({
            undoStack: [...state.undoStack, command],
            redoStack: state.redoStack.slice(0, -1),
          });
        } catch (error) {
          console.error("Failed to redo command:", error);
          throw error;
        }
      },

      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,

      clearHistory: () => {
        set({ undoStack: [], redoStack: [] });
      },

      getUndoDescription: () => {
        const state = get();
        if (!state.canUndo()) {
          return null;
        }
        return state.undoStack[state.undoStack.length - 1].description;
      },

      getRedoDescription: () => {
        const state = get();
        if (!state.canRedo()) {
          return null;
        }
        return state.redoStack[state.redoStack.length - 1].description;
      },
    }),
    {
      name: "incrementum-undo-redo-storage",
      // Only persist limited data to avoid storage issues
      partialize: (state) => ({
        undoStack: state.undoStack.slice(-10), // Only last 10 commands
        redoStack: state.redoStack.slice(-10),
        maxHistorySize: state.maxHistorySize,
      }),
    }
  )
);

/**
 * Helper to create a command ID
 */
export function createCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Base class for creating undoable commands
 */
export abstract class UndoableCommandBase implements UndoableCommand {
  readonly id: string;
  readonly type: OperationType;
  readonly description: string;
  readonly timestamp: number;

  constructor(type: OperationType, description: string) {
    this.id = createCommandId();
    this.type = type;
    this.description = description;
    this.timestamp = Date.now();
  }

  abstract execute(): Promise<void>;
  abstract undo(): Promise<void>;
  abstract redo(): Promise<void>;
}
