import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "../../utils";

export interface QueueNavigationControlsProps {
  currentDocumentIndex?: number;
  totalDocuments?: number;
  hasMoreChunks?: boolean;
  onPreviousDocument: () => void;
  onNextDocument: () => void;
  onNextChunk: () => void;
  disabled?: boolean;
  className?: string;
}

export function QueueNavigationControls({
  currentDocumentIndex = 0,
  totalDocuments = 0,
  hasMoreChunks = false,
  onPreviousDocument,
  onNextDocument,
  onNextChunk,
  disabled = false,
  className,
}: QueueNavigationControlsProps) {
  const isAtFirstDocument = currentDocumentIndex <= 0;
  const isAtLastDocument = currentDocumentIndex >= totalDocuments - 1;

  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      style={{ zIndex: 40 }}
    >
      {/* Position Indicator */}
      {totalDocuments > 0 && (
        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          {currentDocumentIndex + 1} / {totalDocuments}
        </span>
      )}

      <div className="h-6 w-px bg-border" />

      {/* Previous Document */}
      <button
        onClick={onPreviousDocument}
        disabled={isAtFirstDocument || disabled}
        className="p-2 rounded-md hover:bg-muted transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        title="Previous Document"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Next Document */}
      <button
        onClick={onNextDocument}
        disabled={isAtLastDocument || disabled}
        className="p-2 rounded-md hover:bg-muted transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        title="Next Document"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-border" />

      {/* Next Chunk */}
      <button
        onClick={onNextChunk}
        disabled={!hasMoreChunks || disabled}
        className="p-2 rounded-md hover:bg-muted transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        title="Next Chunk"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
