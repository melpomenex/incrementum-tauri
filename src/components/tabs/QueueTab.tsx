import { ReviewQueueView } from "../review/ReviewQueueView";
import { useTabsStore } from "../../stores";
import type { QueueItem } from "../../types/queue";
import { ReviewTab, DocumentViewer } from "./TabRegistry";

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

  return <ReviewQueueView onStartReview={handleStartReview} onOpenDocument={handleOpenDocument} />;
}
