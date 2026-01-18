import { Document } from "../../types";

interface DocumentViewerProps {
  document: Document;
  content?: string;
}

export function MarkdownViewer({ document, content }: DocumentViewerProps) {
  return (
    <div className="markdown-viewer prose prose-sm max-w-none dark:prose-invert mobile-reading-prose">
      <h1 className="text-2xl font-bold mb-4 mobile-reading-title">{document.title}</h1>
      {content ? (
        <div className="whitespace-pre-wrap">{content}</div>
      ) : (
        <div className="text-muted-foreground italic">No content available</div>
      )}
    </div>
  );
}
