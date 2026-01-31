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
  initialViewMode?: "document" | "extracts" | "cards";
}

export function DocumentViewer({ documentId, initialViewMode }: DocumentViewerWithAssistantProps) {
  const [assistantInputActive, setAssistantInputActive] = useState(false);
  const [selection, setSelection] = useState("");
  const [scrollState, setScrollState] = useState<{ pageNumber?: number; scrollPercent?: number }>({});
  const [pdfContextText, setPdfContextText] = useState<string | undefined>(undefined);
  const [videoContext, setVideoContext] = useState<{
    videoId: string;
    title?: string;
    transcript?: string;
    currentTime?: number;
    duration?: number;
  } | null>(null);
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
  // Only hide assistant on mobile devices (< 768px), not on tablets or small screens
  const isMobile = deviceInfo.isMobile;

  useEffect(() => {
    let isActive = true;
    setPdfContextText(undefined);

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

  // Process content for assistant based on document type
  useEffect(() => {
    let isActive = true;
    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;

    // If video context is available, use that
    if (videoContext?.transcript) {
      const videoText = `Video: ${videoContext.title || videoContext.videoId}\nDuration: ${formatDuration(videoContext.duration || 0)}\n\nTRANSCRIPT:\n${videoContext.transcript}`;
      
      trimToTokenWindow(videoText, maxTokens, aiModel, selection)
        .then((trimmed) => {
          if (isActive) {
            setAssistantContent(trimmed);
          }
        })
        .catch(() => {
          if (isActive) {
            setAssistantContent(videoText.slice(0, maxTokens * 4));
          }
        });
      
      return () => {
        isActive = false;
      };
    }

    // Otherwise use regular document content
    const baseContent = pdfContextText ?? currentDocument?.content ?? documentContent;

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
  }, [currentDocument?.content, documentContent, selection, contextWindowTokens, aiModel, pdfContextText, videoContext]);

  const assistantContext = useMemo<AssistantContext>(() => {
    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;
    
    // If video context is available, create video type context
    if (videoContext?.videoId) {
      return {
        type: "video",
        documentId,
        selection: selection || undefined,
        content: assistantContent,
        contextWindowTokens: maxTokens,
        position: {
          currentTime: videoContext.currentTime,
        },
        metadata: {
          title: videoContext.title,
          duration: videoContext.duration,
          videoId: videoContext.videoId,
        },
      };
    }
    
    // Otherwise create document type context
    return {
      type: "document",
      documentId,
      selection: selection || undefined,
      content: assistantContent,
      contextWindowTokens: maxTokens,
      position: scrollState,
    };
  }, [assistantContent, documentId, selection, contextWindowTokens, scrollState, videoContext]);

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
        initialViewMode={initialViewMode}
        onPdfContextTextChange={setPdfContextText}
        contextPageWindow={2}
        onVideoContextChange={setVideoContext}
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

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
