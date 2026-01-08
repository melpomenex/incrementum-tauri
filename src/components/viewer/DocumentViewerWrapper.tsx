/**
 * Wrapper component that adds Assistant panel to DocumentViewer
 */
import { useState } from "react";
import { DocumentViewer as BaseDocumentViewer } from "./DocumentViewer";
import { AssistantPanel, type AssistantContext } from "../assistant/AssistantPanel";

interface DocumentViewerWithAssistantProps {
  documentId: string;
}

export function DocumentViewer({ documentId }: DocumentViewerWithAssistantProps) {
  const [assistantContext, setAssistantContext] = useState<AssistantContext>({
    type: "document",
    documentId,
  });

  return (
    <div className="flex h-full">
      {/* Document Viewer */}
      <div className="flex-1 h-full overflow-hidden">
        <BaseDocumentViewer documentId={documentId} />
      </div>

      {/* Assistant Panel */}
      <AssistantPanel
        context={assistantContext}
        className="flex-shrink-0"
      />
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
  const [currentUrl, setCurrentUrl] = useState("");
  const [assistantContext, setAssistantContext] = useState<AssistantContext>({
    type: "web",
  });

  // TODO: This needs to properly extract the URL from the internal WebBrowser state
  // For now, we'll wrap it and let the internal component handle it

  return (
    <div className="flex h-full">
      {/* Web Browser */}
      <div className="flex-1 h-full overflow-hidden">
        <BaseWebBrowserTab />
      </div>

      {/* Assistant Panel */}
      <AssistantPanel
        context={assistantContext}
        onContextChange={setAssistantContext}
        className="flex-shrink-0"
      />
    </div>
  );
}
