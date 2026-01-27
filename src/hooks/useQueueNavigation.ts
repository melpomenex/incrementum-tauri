import { useCallback, useMemo, useState, useEffect } from "react";
import { useQueueStore } from "../stores/queueStore";
import { useTabsStore } from "../stores/tabsStore";
import { DocumentViewer } from "../components/tabs/TabRegistry";
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
  const { addTab, setActiveTab } = useTabsStore();

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
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [currentGroup, setCurrentGroup] = useState<DocumentGroup | null>(
    documentGroups[0] || null
  );

  // Update current group when document groups change
  useEffect(() => {
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

  // Open document viewer tab
  const openDocumentViewer = useCallback((item: QueueItem) => {
    const tabId = addTab({
      title: item.documentTitle || "Document",
      icon: "document",
      type: "document-viewer",
      content: DocumentViewer,
      closable: true,
      data: { documentId: item.documentId },
    });
    setActiveTab(tabId);
  }, [addTab, setActiveTab]);

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
  }, [canGoToPreviousDocument, currentDocumentIndex, documentGroups, openDocumentViewer]);

  const goToNextDocument = useCallback(() => {
    if (!canGoToNextDocument) return;

    const newIndex = currentDocumentIndex + 1;
    setCurrentDocumentIndex(newIndex);

    // Open document viewer for next document
    const nextGroup = documentGroups[newIndex];
    if (nextGroup && nextGroup.items[0]) {
      openDocumentViewer(nextGroup.items[0]);
    }
  }, [canGoToNextDocument, currentDocumentIndex, documentGroups, openDocumentViewer]);

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
  }, [canGoToNextChunk, currentGroup, openDocumentViewer]);

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
  }, [documentGroups, openDocumentViewer]);

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
