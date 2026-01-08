import { useCallback, useMemo } from "react";
import { useQueueStore } from "../stores/queueStore";
import { useTabsStore } from "../stores/tabsStore";
import type { QueueItem } from "../types";

export interface DocumentGroup {
  documentId: string;
  documentTitle: string;
  items: QueueItem[];
  currentIndex: number; // Index within the group
}

export interface QueueNavigationState {
  // Grouped queue by document
  documentGroups: DocumentGroup[];
  // Current position
  currentDocumentIndex: number;
  currentGroup: DocumentGroup | null;
  currentItem: QueueItem | null;
  // Navigation helpers
  canGoToPreviousDocument: boolean;
  canGoToNextDocument: boolean;
  canGoToNextChunk: boolean;
}

export function useQueueNavigation() {
  const { filteredItems: queueItems } = useQueueStore();
  const { addTab } = useTabsStore();

  // Group queue items by documentId
  const documentGroups = useMemo(() => {
    const groups = new Map<string, QueueItem[]>();

    // Group items by documentId
    queueItems.forEach((item) => {
      if (!groups.has(item.documentId)) {
        groups.set(item.documentId, []);
      }
      groups.get(item.documentId)!.push(item);
    });

    // Convert to DocumentGroup array
    return Array.from(groups.entries()).map(([documentId, items]) => ({
      documentId,
      documentTitle: items[0]?.documentTitle || "Unknown Document",
      items,
      currentIndex: 0,
    }));
  }, [queueItems]);

  // Track current document and item
  const [currentDocumentIndex, setCurrentDocumentIndex] = React.useState(0);
  const [currentGroup, setCurrentGroup] = React.useState<DocumentGroup | null>(
    documentGroups[0] || null
  );

  // Update current group when document groups change
  React.useEffect(() => {
    if (documentGroups.length > 0) {
      setCurrentGroup(documentGroups[currentDocumentIndex] || documentGroups[0]);
    } else {
      setCurrentGroup(null);
    }
  }, [documentGroups, currentDocumentIndex]);

  // Current item in the group
  const currentItem = useMemo(() => {
    if (!currentGroup || currentGroup.items.length === 0) return null;
    return currentGroup.items[currentGroup.currentIndex] || null;
  }, [currentGroup]);

  // Navigation helpers
  const canGoToPreviousDocument = currentDocumentIndex > 0;
  const canGoToNextDocument = currentDocumentIndex < documentGroups.length - 1;
  const canGoToNextChunk = currentGroup
    ? currentGroup.currentIndex < currentGroup.items.length - 1
    : false;

  // Navigation actions
  const goToPreviousDocument = useCallback(() => {
    if (!canGoToPreviousDocument) return;

    const newIndex = currentDocumentIndex - 1;
    setCurrentDocumentIndex(newIndex);

    // Open document viewer for previous document
    const prevGroup = documentGroups[newIndex];
    if (prevGroup && prevGroup.items[0]) {
      openDocumentViewer(prevGroup.items[0]);
    }
  }, [canGoToPreviousDocument, currentDocumentIndex, documentGroups]);

  const goToNextDocument = useCallback(() => {
    if (!canGoToNextDocument) return;

    const newIndex = currentDocumentIndex + 1;
    setCurrentDocumentIndex(newIndex);

    // Open document viewer for next document
    const nextGroup = documentGroups[newIndex];
    if (nextGroup && nextGroup.items[0]) {
      openDocumentViewer(nextGroup.items[0]);
    }
  }, [canGoToNextDocument, currentDocumentIndex, documentGroups]);

  const goToNextChunk = useCallback(() => {
    if (!canGoToNextChunk || !currentGroup) return;

    const newIndex = currentGroup.currentIndex + 1;
    setCurrentGroup({
      ...currentGroup,
      currentIndex: newIndex,
    });

    // Open document viewer for the next chunk
    const nextItem = currentGroup.items[newIndex];
    if (nextItem) {
      openDocumentViewer(nextItem);
    }
  }, [canGoToNextChunk, currentGroup]);

  const goToDocument = useCallback((documentId: string) => {
    const index = documentGroups.findIndex((g) => g.documentId === documentId);
    if (index !== -1) {
      setCurrentDocumentIndex(index);

      // Open document viewer
      const group = documentGroups[index];
      if (group && group.items[0]) {
        openDocumentViewer(group.items[0]);
      }
    }
  }, [documentGroups]);

  // Open document viewer tab
  const openDocumentViewer = useCallback((item: QueueItem) => {
    // This will be handled by the component that uses this hook
    // We just emit the item and let the component decide what to do
    return item;
  }, []);

  return {
    // State
    documentGroups,
    currentDocumentIndex,
    currentGroup,
    currentItem,
    totalDocuments: documentGroups.length,

    // Navigation helpers
    canGoToPreviousDocument,
    canGoToNextDocument,
    canGoToNextChunk,

    // Actions
    goToPreviousDocument,
    goToNextDocument,
    goToNextChunk,
    goToDocument,
    openDocumentViewer,
  };
}

// Import React for useState and useEffect
import React from "react";
