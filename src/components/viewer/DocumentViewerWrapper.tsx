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
  const [assistantInputActive, setAssistantInputActive] = useState(false);

  return (
    <div className="flex h-full">
      {/* Document Viewer */}
      <div className="flex-1 h-full overflow-hidden">
        <BaseDocumentViewer
          documentId={documentId}
          disableHoverRating={assistantInputActive}
        />
      </div>

      {/* Assistant Panel */}
      <AssistantPanel
        context={assistantContext}
        className="flex-shrink-0"
        onInputHoverChange={setAssistantInputActive}
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
  return (
    <BaseWebBrowserTab />
  );
}
