import { ReviewQueueView } from "../components/review/ReviewQueueView";
import { useReviewStore, useTabsStore } from "../stores";
import { DocumentViewer } from "../components/tabs/TabRegistry";
import type { QueueItem } from "../types/queue";
import { ReviewTab } from "../components/tabs/TabRegistry";
import { QueueScrollPage } from "./QueueScrollPage";

export function QueuePage() {
  const { addTab } = useTabsStore();

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
    });
  };

  const handleOpenDocument = (item: QueueItem) => {
    addTab({
      title: item.documentTitle,
      icon: "📄",
      type: "document-viewer",
      content: DocumentViewer,
      closable: true,
      data: { documentId: item.documentId },
    });
  };

  const handleOpenScrollMode = () => {
    addTab({
      title: "Scroll Mode",
      icon: "📱",
      type: "queue-scroll",
      content: QueueScrollPage,
      closable: true,
    });
  };

  return (
    <ReviewQueueView
      onStartReview={handleStartReview}
      onOpenDocument={handleOpenDocument}
      onOpenScrollMode={handleOpenScrollMode}
    />
  );
}
