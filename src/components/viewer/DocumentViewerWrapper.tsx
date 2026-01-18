/**
 * Wrapper component that adds Assistant panel to DocumentViewer
 */
import { useEffect, useMemo, useState } from "react";
import { DocumentViewer as BaseDocumentViewer } from "./DocumentViewer";
import { AssistantPanel, type AssistantContext, type AssistantPosition } from "../assistant/AssistantPanel";
import { useDocumentStore, useSettingsStore } from "../../stores";
import * as documentsApi from "../../api/documents";
import { trimToTokenWindow } from "../../utils/tokenizer";
import { getDeviceInfo } from "../../lib/pwa";

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
  const aiModel = useSettingsStore((state) => state.settings.ai.model);
  const [documentContent, setDocumentContent] = useState<string | undefined>(undefined);
  const [assistantContent, setAssistantContent] = useState<string | undefined>(undefined);
  const [assistantPosition, setAssistantPosition] = useState<AssistantPosition>(() => {
    const saved = localStorage.getItem(ASSISTANT_POSITION_KEY);
    return saved === "left" ? "left" : "right";
  });
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;

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

  useEffect(() => {
    let isActive = true;
    const baseContent = currentDocument?.content ?? documentContent;
    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;

    if (!baseContent) {
      setAssistantContent(undefined);
      return () => {
        isActive = false;
      };
    }

    trimToTokenWindow(baseContent, maxTokens, aiModel, selection)
      .then((trimmed) => {
        if (isActive) {
          setAssistantContent(trimmed);
        }
      })
      .catch(() => {
        if (isActive) {
          setAssistantContent(baseContent.slice(0, maxTokens * 4));
        }
      });

    return () => {
      isActive = false;
    };
  }, [currentDocument?.content, documentContent, selection, contextWindowTokens, aiModel]);

  const assistantContext = useMemo<AssistantContext>(() => {
    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;
    return {
      type: "document",
      documentId,
      selection: selection || undefined,
      content: assistantContent,
      contextWindowTokens: maxTokens,
      position: scrollState,
    };
  }, [assistantContent, documentId, selection, contextWindowTokens, scrollState]);

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
      {isMobile ? (
        documentViewer
      ) : assistantPosition === "left" ? (
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
