import { useState, useEffect } from "react";
import {
  Copy,
  FileText,
  ExternalLink,
  FolderOpen,
  X,
  Check,
  AlertCircle,
  Download,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";
import { Modal } from "../common/Modal";
import {
  exportAssistantMessageToObsidian,
  exportConversationToObsidian,
  copyToClipboard,
  generateConversationMarkdown,
  generateSingleMessageMarkdown,
  getIntegrationSettings,
  type ConversationMessage,
  type ObsidianConfig,
} from "../../api/integrations";

interface ShareMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ConversationMessage[];
  singleMessage?: ConversationMessage;
  contextInfo?: string;
  documentTitle?: string;
}

type ShareMode = "single" | "conversation" | "clipboard";

export function ShareMessageDialog({
  isOpen,
  onClose,
  messages,
  singleMessage,
  contextInfo,
  documentTitle = "AI Conversation",
}: ShareMessageDialogProps) {
  const [shareMode, setShareMode] = useState<ShareMode>(singleMessage ? "single" : "conversation");
  const [obsidianConfig, setObsidianConfig] = useState<ObsidianConfig | null>(null);
  const [customTitle, setCustomTitle] = useState(documentTitle);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [activeTab, setActiveTab] = useState<"obsidian" | "clipboard">("obsidian");

  // Load Obsidian config when dialog opens
  useEffect(() => {
    if (isOpen) {
      const settings = getIntegrationSettings();
      if (settings.obsidian) {
        setObsidianConfig(settings.obsidian);
      }
      setCustomTitle(documentTitle);
      setExportResult(null);
      setCopiedToClipboard(false);
    }
  }, [isOpen, documentTitle]);

  // Update share mode when singleMessage prop changes
  useEffect(() => {
    if (singleMessage) {
      setShareMode("single");
    } else {
      setShareMode("conversation");
    }
  }, [singleMessage]);

  const handleExportToObsidian = async () => {
    if (!obsidianConfig) return;

    setIsExporting(true);
    setExportResult(null);

    try {
      let filePath: string;

      if (shareMode === "single" && singleMessage) {
        filePath = await exportAssistantMessageToObsidian(
          singleMessage,
          customTitle,
          obsidianConfig,
          contextInfo
        );
      } else {
        // Export conversation (all user and assistant messages)
        const messagesToExport = messages.filter(
          (m) => m.role === "user" || m.role === "assistant"
        );
        filePath = await exportConversationToObsidian(
          messagesToExport,
          customTitle,
          obsidianConfig,
          contextInfo
        );
      }

      setExportResult({
        success: true,
        message: `Exported to: ${filePath}`,
      });
    } catch (error) {
      setExportResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to export to Obsidian",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    let markdown: string;

    if (shareMode === "single" && singleMessage) {
      markdown = generateSingleMessageMarkdown(singleMessage, customTitle, contextInfo);
    } else {
      const messagesToExport = messages.filter(
        (m) => m.role === "user" || m.role === "assistant"
      );
      markdown = generateConversationMarkdown(messagesToExport, customTitle, contextInfo);
    }

    const success = await copyToClipboard(markdown);
    if (success) {
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    }
  };

  const handleCopySingleMessage = async (message: ConversationMessage) => {
    const markdown = generateSingleMessageMarkdown(message, customTitle, contextInfo);
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    }
  };

  // Preview content
  const getPreviewContent = () => {
    if (shareMode === "single" && singleMessage) {
      return generateSingleMessageMarkdown(singleMessage, customTitle, contextInfo);
    } else {
      const messagesToExport = messages.filter(
        (m) => m.role === "user" || m.role === "assistant"
      );
      return generateConversationMarkdown(messagesToExport, customTitle, contextInfo);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Conversation" size="lg">
      <div className="space-y-4">
        {/* Mode Selection */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {singleMessage && (
            <button
              onClick={() => setShareMode("single")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                shareMode === "single"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Single Message
            </button>
          )}
          <button
            onClick={() => setShareMode("conversation")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              shareMode === "conversation"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessagesSquare className="w-4 h-4" />
            Full Conversation
          </button>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Title
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter a title for the export..."
          />
        </div>

        {/* Context Info Display */}
        {contextInfo && (
          <div className="p-3 bg-muted/50 rounded-md">
            <span className="text-xs text-muted-foreground font-medium">
              Context: {contextInfo}
            </span>
          </div>
        )}

        {/* Export Tabs */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("obsidian")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "obsidian"
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Export to Obsidian
              </div>
            </button>
            <button
              onClick={() => setActiveTab("clipboard")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "clipboard"
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </div>
            </button>
          </div>

          <div className="p-4">
            {activeTab === "obsidian" ? (
              <div className="space-y-4">
                {!obsidianConfig ? (
                  <div className="text-center py-6">
                    <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Obsidian not configured
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please configure your Obsidian vault in Settings → Integrations
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                      <FolderOpen className="w-5 h-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {obsidianConfig.vaultPath}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Notes folder: {obsidianConfig.notesFolder}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleExportToObsidian}
                      disabled={isExporting || !customTitle.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export to Obsidian
                        </>
                      )}
                    </button>

                    {exportResult && (
                      <div
                        className={`p-3 rounded-md text-sm ${
                          exportResult.success
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {exportResult.success ? (
                            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          )}
                          <span className="break-all">{exportResult.message}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={getPreviewContent()}
                    readOnly
                    className="w-full h-48 px-3 py-2 bg-muted/30 border border-border rounded-md text-xs font-mono resize-none focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleCopyToClipboard}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  {copiedToClipboard ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Markdown to Clipboard
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Message Count Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {shareMode === "single" && singleMessage
              ? "Exporting 1 message"
              : `Exporting ${messages.filter((m) => m.role === "user" || m.role === "assistant").length} messages`}
          </span>
          {obsidianConfig && (
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Obsidian ready
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
