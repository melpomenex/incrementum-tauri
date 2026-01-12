import { ReviewQueueView } from "../review/ReviewQueueView";
import { useTabsStore } from "../../stores";
import type { QueueItem } from "../../types/queue";
import { ReviewTab, DocumentViewer } from "./TabRegistry";
import { QueueScrollPage } from "../../pages/QueueScrollPage";

export function QueueTab() {
  const { addTab } = useTabsStore();

  const handleStartReview = () => {
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
