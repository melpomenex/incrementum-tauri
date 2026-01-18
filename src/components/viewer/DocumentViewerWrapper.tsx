/**
 * Wrapper component that adds Assistant panel to DocumentViewer
 */
import { useEffect, useMemo, useState } from "react";
import { DocumentViewer as BaseDocumentViewer } from "./DocumentViewer";
import { AssistantPanel, type AssistantContext, type AssistantPosition } from "../assistant/AssistantPanel";
import { useDocumentStore, useSettingsStore } from "../../stores";
import * as documentsApi from "../../api/documents";

const ASSISTANT_POSITION_KEY = "assistant-panel-position";

interface DocumentViewerWithAssistantProps {
  documentId: string;
}

export function DocumentViewer({ documentId }: DocumentViewerWithAssistantProps) {
  const [assistantInputActive, setAssistantInputActive] = useState(false);
  const [selection, setSelection] = useState("");
  const [scrollState, setScrollState] = useState<{ pageNumber?: number; scrollPercent?: number }>({});
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const contextWindowTokens = useSettingsStore((state) => state.settings.ai.maxTokens);
  const [documentContent, setDocumentContent] = useState<string | undefined>(undefined);
  const [assistantPosition, setAssistantPosition] = useState<AssistantPosition>(() => {
    const saved = localStorage.getItem(ASSISTANT_POSITION_KEY);
    return saved === "left" ? "left" : "right";
  });

  useEffect(() => {
    let isActive = true;

    const loadDocumentContent = async () => {
      try {
        const doc = await documentsApi.getDocument(documentId);
        if (isActive) {
          setDocumentContent(doc?.content ?? undefined);
        }
      } catch (error) {
        console.error("Failed to load document content for assistant:", error);
        if (isActive) {
          setDocumentContent(undefined);
        }
      }
    };

    loadDocumentContent();

    return () => {
      isActive = false;
    };
  }, [documentId]);

  const assistantContext = useMemo<AssistantContext>(() => {
    const baseContent = currentDocument?.content ?? documentContent;
    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;
    const maxChars = maxTokens * 4;

    let trimmedContent = baseContent;
    if (baseContent && baseContent.length > maxChars) {
      if (selection && baseContent.includes(selection)) {
        const selectionIndex = baseContent.indexOf(selection);
        const windowBefore = Math.floor((maxChars - selection.length) / 2);
        const start = Math.max(0, selectionIndex - windowBefore);
        const end = Math.min(baseContent.length, start + maxChars);
        trimmedContent = baseContent.slice(start, end);
      } else {
        trimmedContent = baseContent.slice(0, maxChars);
      }
    }

    return {
      type: "document",
      documentId,
      selection: selection || undefined,
      content: trimmedContent,
      contextWindowTokens: maxTokens,
      position: scrollState,
    };
  }, [currentDocument?.content, documentContent, documentId, selection, contextWindowTokens, scrollState]);

  const handlePositionChange = (newPosition: AssistantPosition) => {
    setAssistantPosition(newPosition);
    localStorage.setItem(ASSISTANT_POSITION_KEY, newPosition);
  };

  const assistantPanel = (
    <AssistantPanel
      context={assistantContext}
      className="flex-shrink-0"
      onInputHoverChange={setAssistantInputActive}
      position={assistantPosition}
      onPositionChange={handlePositionChange}
    />
  );

  const documentViewer = (
    <div className="flex-1 h-full overflow-hidden">
      <BaseDocumentViewer
        documentId={documentId}
        disableHoverRating={assistantInputActive}
        onSelectionChange={setSelection}
        onScrollPositionChange={setScrollState}
      />
    </div>
  );

  return (
    <div className="flex h-full">
      {assistantPosition === "left" ? (
        <>
          {assistantPanel}
          {documentViewer}
        </>
      ) : (
        <>
          {documentViewer}
          {assistantPanel}
        </>
      )}
    </div>
  );
}

/**
 * Wrapper component that adds Assistant panel to WebBrowser
 */
import { WebBrowserTab as BaseWebBrowserTab } from "../tabs/WebBrowserTab";

interface WebBrowserWithAssistantProps {
  // Add any props if needed
}

export function WebBrowserTab(_props: WebBrowserWithAssistantProps) {
  return (
    <BaseWebBrowserTab />
  );
}
