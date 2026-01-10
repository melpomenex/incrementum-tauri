/**
 * Undoable API
 * Convenient wrappers for operations that support undo/redo
 */

import { useUndoRedo } from "../hooks/useUndoRedo";
import {
  DeleteDocumentCommand,
  DeleteExtractCommand,
  BulkDeleteExtractsCommand,
  DeleteLearningItemCommand,
  BulkDeleteItemsCommand,
  ArchiveDocumentCommand,
  CreateExtractCommand,
} from "../commands/undoableCommands";

/**
 * Hook providing undoable operations
 */
export function useUndoableOperations() {
  const { execute } = useUndoRedo();

  return {
    /**
     * Delete a document with undo support
     */
    deleteDocument: (documentId: string, onSuccess?: () => void) => {
      return execute(new DeleteDocumentCommand(documentId, onSuccess));
    },

    /**
     * Delete an extract with undo support
     */
    deleteExtract: (extractId: string, onSuccess?: () => void) => {
      return execute(new DeleteExtractCommand(extractId, onSuccess));
    },

    /**
     * Bulk delete extracts with undo support
     */
    bulkDeleteExtracts: (extractIds: string[], onSuccess?: () => void) => {
      return execute(new BulkDeleteExtractsCommand(extractIds, onSuccess));
    },

    /**
     * Delete a learning item with undo support
     */
    deleteLearningItem: (itemId: string, onSuccess?: () => void) => {
      return execute(new DeleteLearningItemCommand(itemId, onSuccess));
    },

    /**
     * Bulk delete learning items with undo support
     */
    bulkDeleteItems: (itemIds: string[], onSuccess?: () => void) => {
      return execute(new BulkDeleteItemsCommand(itemIds, onSuccess));
    },

    /**
     * Archive/unarchive a document with undo support
     */
    archiveDocument: (documentId: string, archive: boolean, onSuccess?: () => void) => {
      return execute(new ArchiveDocumentCommand(documentId, archive, onSuccess));
    },

    /**
     * Create an extract with undo support (undo deletes it)
     */
    createExtract: (extract: Parameters<typeof CreateExtractCommand.prototype.execute>[0], onSuccess?: () => void) => {
      return execute(new CreateExtractCommand(extract, onSuccess));
    },
  };
}

/**
 * Direct API functions for when you don't want to use hooks
 */
export const undoableOperations = {
  /**
   * Execute an undoable command directly
   */
  execute: async (command: Parameters<ReturnType<typeof useUndoRedo>["execute"]>[0]) => {
    const { execute } = await import("../hooks/useUndoRedo").then((m) => m.useUndoRedo());
    return execute(command);
  },
};
