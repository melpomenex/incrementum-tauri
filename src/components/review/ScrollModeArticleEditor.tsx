import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, CheckCircle, AlertCircle, PencilLine } from "lucide-react";
import { updateDocumentContent } from "../../api/documents";
import type { Document } from "../../types/document";
import { useDocumentStore } from "../../stores/documentStore";
import { cn } from "../../utils";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface ScrollModeArticleEditorProps {
  document: Document;
}

export function ScrollModeArticleEditor({ document }: ScrollModeArticleEditorProps) {
  const { updateDocument } = useDocumentStore();
  const [content, setContent] = useState(document.content ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const lastSavedRef = useRef(content);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const nextContent = document.content ?? "";
    setContent(nextContent);
    lastSavedRef.current = nextContent;
    setSaveStatus("idle");
  }, [document.id, document.content]);

  useEffect(() => {
    if (content === lastSavedRef.current) {
      return;
    }

    setSaveStatus("dirty");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const updated = await updateDocumentContent(document.id, content);
        if (!isMountedRef.current) return;
        lastSavedRef.current = content;
        updateDocument(document.id, { content: updated.content ?? content });
        setSaveStatus("saved");
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
        statusTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus("idle");
          }
        }, 2000);
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error("Failed to save article edits:", error);
        setSaveStatus("error");
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, document.id, updateDocument]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const renderSaveStatus = () => {
    if (saveStatus === "saving") {
      return (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Saving...
        </span>
      );
    }
    if (saveStatus === "saved") {
      return (
        <span className="flex items-center gap-2 text-xs text-emerald-500">
          <CheckCircle className="w-3.5 h-3.5" />
          Saved
        </span>
      );
    }
    if (saveStatus === "error") {
      return (
        <span className="flex items-center gap-2 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5" />
          Save failed
        </span>
      );
    }
    if (saveStatus === "dirty") {
      return (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <PencilLine className="w-3.5 h-3.5" />
          Unsaved
        </span>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/30">
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Web Article
        </span>
        <span className="px-3 py-1.5 bg-muted/60 text-muted-foreground rounded-lg text-sm font-medium">
          Markdown Editor
        </span>
      </div>

      <div className="absolute top-6 right-6 flex items-center gap-4 text-sm text-muted-foreground">
        {document.filePath?.startsWith("http") && (
          <a
            href={document.filePath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open source
          </a>
        )}
        {renderSaveStatus()}
      </div>

      <div className="w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">{document.title}</h1>
          <p className="text-sm text-muted-foreground">
            Edit the article text and add notes directly in markdown.
          </p>
        </div>

        <div className={cn(
          "bg-card border border-border rounded-2xl shadow-xl",
          "min-h-[50vh] max-h-[70vh] overflow-y-auto"
        )}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write or paste the article text here..."
            className="w-full min-h-[50vh] p-8 bg-transparent text-base leading-relaxed text-foreground outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
