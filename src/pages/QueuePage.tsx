import { ReviewQueueView } from "../components/review/ReviewQueueView";
import { useTabsStore } from "../stores";
import { DocumentViewer } from "../components/tabs/TabRegistry";
import type { QueueItem } from "../types/queue";
import { ReviewTab } from "../components/tabs/TabRegistry";

export function QueuePage() {
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
