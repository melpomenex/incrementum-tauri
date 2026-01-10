import { DocumentsView } from "../components/documents/DocumentsView";
import { DocumentViewer } from "../components/tabs/TabRegistry";
import { useTabsStore } from "../stores";
import type { Document } from "../types/document";

export function DocumentsPage() {
  const { addTab } = useTabsStore();

  const handleOpenDocument = (doc: Document) => {
    addTab({
      title: doc.title,
      icon: doc.fileType === "pdf" ? "📕" : doc.fileType === "epub" ? "📖" : doc.fileType === "youtube" ? "📺" : "📄",
      type: "document-viewer",
      content: DocumentViewer,
      closable: true,
      data: { documentId: doc.id },
    });
  };

  return <DocumentsView onOpenDocument={handleOpenDocument} enableYouTubeImport />;
}
