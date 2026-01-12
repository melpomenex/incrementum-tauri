/**
 * Wrapper component that adds Assistant panel to DocumentViewer
 */
import { useEffect, useMemo, useState } from "react";
import { DocumentViewer as BaseDocumentViewer } from "./DocumentViewer";
import { AssistantPanel, type AssistantContext, type AssistantPosition } from "../assistant/AssistantPanel";
import { useDocumentStore } from "../../stores";
import * as documentsApi from "../../api/documents";

const ASSISTANT_POSITION_KEY = "assistant-panel-position";

interface DocumentViewerWithAssistantProps {
  documentId: string;
}

export function DocumentViewer({ documentId }: DocumentViewerWithAssistantProps) {
  const [assistantInputActive, setAssistantInputActive] = useState(false);
  const [selection, setSelection] = useState("");
  const currentDocument = useDocumentStore((state) => state.currentDocument);
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

  const assistantContext = useMemo<AssistantContext>(
    () => ({
      type: "document",
      documentId,
      selection: selection || undefined,
      content: currentDocument?.content ?? documentContent,
    }),
    [currentDocument?.content, documentContent, documentId, selection]
  );

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

