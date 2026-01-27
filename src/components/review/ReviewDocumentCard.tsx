import { useMemo } from "react";
import { FileText } from "lucide-react";
import { useTabsStore } from "../../stores";
import { DocumentViewer } from "../tabs/TabRegistry";
import type { ReviewDocumentItem } from "../../stores/reviewStore";

interface ReviewDocumentCardProps {
  item: ReviewDocumentItem;
}

export function ReviewDocumentCard({ item }: ReviewDocumentCardProps) {
  const { addTab } = useTabsStore();

  const progressLabel = useMemo(() => {
    if (typeof item.progress !== "number") return null;
    return `${Math.round(item.progress)}% read`;
  }, [item.progress]);

  return (
    <div className="w-full max-w-2xl mx-auto px-2 md:px-0">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <span className="text-xs md:text-sm uppercase tracking-wide text-foreground/80 font-medium">
          Document
        </span>
        {item.tags.length > 0 && (
          <>
            <span className="text-foreground/60">•</span>
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-muted/60 text-foreground border border-border/50 rounded"
              >
                {tag}
              </span>
            ))}
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="text-xs md:text-sm uppercase tracking-wide text-foreground/80 mb-3 font-medium">
          Reading item
        </div>
        <h2 className="text-lg md:text-2xl font-semibold text-foreground mb-3">
          {item.documentTitle || "Untitled document"}
        </h2>
        <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
          {item.category && <span>{item.category}</span>}
          {progressLabel && <span>{progressLabel}</span>}
        </div>

        <div className="mt-6">
          <button
            onClick={() =>
              addTab({
                title: item.documentTitle || "Document",
                icon: "📄",
                type: "document-viewer",
                content: DocumentViewer,
                closable: true,
                data: { documentId: item.documentId },
              })
            }
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Open document
          </button>
        </div>
      </div>
    </div>
  );
}
