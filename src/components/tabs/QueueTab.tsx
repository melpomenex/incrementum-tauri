import { ReviewQueueView } from "../review/ReviewQueueView";
import { useReviewStore, useTabsStore } from "../../stores";
import type { QueueItem } from "../../types/queue";
import { ReviewTab, DocumentViewer } from "./TabRegistry";
import { QueueScrollPage } from "../../pages/QueueScrollPage";
import { usePaneId } from "../common/Tabs";

export function QueueTab() {
  const { addTab } = useTabsStore();
  const paneId = usePaneId();

  const handleStartReview = (itemId?: string) => {
    if (itemId) {
      void useReviewStore.getState().startReviewAtItem(itemId);
    }
    addTab({
      title: "Review",
      icon: "🎴",
      type: "review",
      content: ReviewTab,
      closable: true,
    }, paneId);
  };

  const handleOpenDocument = (item: QueueItem) => {
    addTab({
      title: item.documentTitle,
      icon: "📄",
      type: "document-viewer",
      content: DocumentViewer,
      closable: true,
      data: { documentId: item.documentId },
    }, paneId);
  };

  const handleOpenScrollMode = () => {
    addTab({
      title: "Scroll Mode",
      icon: "📱",
      type: "queue-scroll",
      content: QueueScrollPage,
      closable: true,
    }, paneId);
  };

  return (
    <ReviewQueueView
      onStartReview={handleStartReview}
      onOpenDocument={handleOpenDocument}
      onOpenScrollMode={handleOpenScrollMode}
    />
  );
}
