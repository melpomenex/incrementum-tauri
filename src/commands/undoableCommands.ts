/**
 * Undoable Commands
 * Pre-built commands for common operations that support undo/redo
 */

import { invokeCommand as invoke } from "../lib/tauri";
import { Document } from "../types/document";
import { Extract } from "../types/extract";
import { LearningItem } from "../types/learning-item";
import {
  OperationType,
  UndoableCommandBase,
  createCommandId,
} from "../stores/undoRedoStore";

/**
 * Delete document command
 */
export class DeleteDocumentCommand extends UndoableCommandBase {
  private deletedDocument: Document | null = null;

  constructor(
    private documentId: string,
    private onSuccess?: () => void
  ) {
    super(
      OperationType.DeleteDocument,
      `Delete document: ${documentId.slice(0, 8)}...`
    );
  }

  async execute(): Promise<void> {
    // Get the document before deleting
    this.deletedDocument = await invoke<Document>("get_document", {
      id: this.documentId,
    });

    if (!this.deletedDocument) {
      throw new Error("Document not found");
    }

    await invoke("delete_document", { id: this.documentId });
    this.onSuccess?.();
  }

  async undo(): Promise<void> {
    if (!this.deletedDocument) {
      throw new Error("Cannot undo: document data not available");
    }

    await invoke("create_document", {
      title: this.deletedDocument.title,
      filePath: this.deletedDocument.filePath,
      fileType: this.deletedDocument.fileType,
    });
  }

  async redo(): Promise<void> {
    await this.execute();
  }
}

/**
 * Delete extract command
 */
export class DeleteExtractCommand extends UndoableCommandBase {
  private deletedExtract: Extract | null = null;

  constructor(
    private extractId: string,
    private onSuccess?: () => void
  ) {
    super(
      OperationType.DeleteExtract,
      `Delete extract: ${extractId.slice(0, 8)}...`
    );
  }

  async execute(): Promise<void> {
    // Get the extract before deleting
    this.deletedExtract = await invoke<Extract>("get_extract", {
      id: this.extractId,
    });

    if (!this.deletedExtract) {
      throw new Error("Extract not found");
    }

    await invoke("delete_extract", { id: this.extractId });
    this.onSuccess?.();
  }

  async undo(): Promise<void> {
    if (!this.deletedExtract) {
      throw new Error("Cannot undo: extract data not available");
    }

    await invoke("create_extract", {
      extract: {
        documentId: this.deletedExtract.documentId,
        title: this.deletedExtract.title,
        content: this.deletedExtract.content,
        extractedAt: this.deletedExtract.extractedAt,
      },
    });
  }

  async redo(): Promise<void> {
    await this.execute();
  }
}

/**
 * Bulk delete extracts command
 */
export class BulkDeleteExtractsCommand extends UndoableCommandBase {
  private deletedExtracts: Extract[] = [];

  constructor(
    private extractIds: string[],
    private onSuccess?: () => void
  ) {
    super(
      OperationType.BulkDeleteExtracts,
      `Delete ${extractIds.length} extract${extractIds.length > 1 ? "s" : ""}`
    );
  }

  async execute(): Promise<void> {
    // Get all extracts before deleting
    for (const id of this.extractIds) {
      try {
        const extract = await invoke<Extract>("get_extract", { id });
        if (extract) {
          this.deletedExtracts.push(extract);
        }
      } catch (e) {
        console.error(`Failed to fetch extract ${id}:`, e);
      }
    }

    await invoke("bulk_delete_extracts", { extractIds: this.extractIds });
    this.onSuccess?.();
  }

  async undo(): Promise<void> {
    // Restore all extracts
    for (const extract of this.deletedExtracts) {
      await invoke("create_extract", {
        extract: {
          documentId: extract.documentId,
          title: extract.title,
          content: extract.content,
          extractedAt: extract.extractedAt,
        },
      });
    }
  }

  async redo(): Promise<void> {
    await this.execute();
  }
}

/**
 * Delete learning item command
 */
export class DeleteLearningItemCommand extends UndoableCommandBase {
  private deletedItem: LearningItem | null = null;

  constructor(
    private itemId: string,
    private onSuccess?: () => void
  ) {
    super(
      OperationType.DeleteLearningItem,
      `Delete card: ${itemId.slice(0, 8)}...`
    );
  }

  async execute(): Promise<void> {
    // Get the item before deleting
    this.deletedItem = await invoke<LearningItem>("get_learning_items").then(
      (items) => items.find((i) => i.id === this.itemId) || null
    );

    if (!this.deletedItem) {
      throw new Error("Learning item not found");
    }

    await invoke("delete_item", { id: this.itemId });
    this.onSuccess?.();
  }

  async undo(): Promise<void> {
    if (!this.deletedItem) {
      throw new Error("Cannot undo: learning item data not available");
    }

    await invoke("create_learning_item", {
      item: this.deletedItem,
    });
  }

  async redo(): Promise<void> {
    await this.execute();
  }
}

/**
 * Bulk delete items command
 */
export class BulkDeleteItemsCommand extends UndoableCommandBase {
  private deletedItems: LearningItem[] = [];

  constructor(
    private itemIds: string[],
    private onSuccess?: () => void
  ) {
    super(
      OperationType.BulkDeleteItems,
      `Delete ${itemIds.length} card${itemIds.length > 1 ? "s" : ""}`
    );
  }

  async execute(): Promise<void> {
    // Get all items before deleting
    const allItems = await invoke<LearningItem[]>("get_learning_items");
    this.deletedItems = allItems.filter((i) => this.itemIds.includes(i.id));

    await invoke("bulk_delete_items", { itemIds: this.itemIds });
    this.onSuccess?.();
  }

  async undo(): Promise<void> {
    // Restore all items
    for (const item of this.deletedItems) {
      await invoke("create_learning_item", {
        item: item,
      });
    }
  }

  async redo(): Promise<void> {
    await this.execute();
  }
}

/**
 * Archive document command
 */
export class ArchiveDocumentCommand extends UndoableCommandBase {
  private previousArchiveState: boolean | null = null;

  constructor(
    private documentId: string,
    private archive: boolean,
    private onSuccess?: () => void
  ) {
    super(
      OperationType.ArchiveDocument,
      `${archive ? "Archive" : "Unarchive"} document`
    );
  }

  async execute(): Promise<void> {
    const doc = await invoke<Document>("get_document", {
      id: this.documentId,
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    this.previousArchiveState = doc.isArchived;

    await invoke("update_document", {
      id: this.documentId,
      updates: { ...doc, isArchived: this.archive },
    });
    this.onSuccess?.();
  }

  async undo(): Promise<void> {
    if (this.previousArchiveState === null) {
      throw new Error("Cannot undo: previous state not available");
    }

    await invoke("update_document", {
      id: this.documentId,
      updates: {
        ...(await invoke<Document>("get_document", { id: this.documentId })),
        isArchived: this.previousArchiveState,
      },
    });
  }

  async redo(): Promise<void> {
    await this.execute();
  }
}

/**
 * Create extract command (can undo by deleting)
 */
export class CreateExtractCommand extends UndoableCommandBase {
  private createdExtractId: string | null = null;

  constructor(
    private extract: Omit<Extract, "id">,
    private onSuccess?: () => void
  ) {
    super(
      OperationType.CreateExtract,
      `Create extract: ${this.extract.title.slice(0, 20)}...`
    );
  }

  async execute(): Promise<void> {
    const created = await invoke<Extract>("create_extract", {
      extract: this.extract,
    });
    this.createdExtractId = created.id;
    this.onSuccess?.();
  }

  async undo(): Promise<void> {
    if (!this.createdExtractId) {
      throw new Error("Cannot undo: extract was not created");
    }

    await invoke("delete_extract", { id: this.createdExtractId });
  }

  async redo(): Promise<void> {
    await this.execute();
  }
}
