import { Document } from "../../types";

interface DocumentViewerProps {
  document: Document;
  content?: string;
}

export function MarkdownViewer({ document, content }: DocumentViewerProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert p-8 bg-background min-h-[500px]">
      <h1 className="text-2xl font-bold mb-4">{document.title}</h1>
      {content ? (
        <div className="whitespace-pre-wrap">{content}</div>
      ) : (
        <div className="text-muted-foreground italic">No content available</div>
      )}
    </div>
  );
}
