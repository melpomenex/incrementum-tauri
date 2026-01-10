import { DocumentsView } from "../documents/DocumentsView";
import { useTabsStore } from "../../stores";
import { DocumentViewer } from "./TabRegistry";
import type { Document } from "../../types/document";

export function DocumentsTab() {
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
