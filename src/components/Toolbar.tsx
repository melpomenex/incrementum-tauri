import { useTabsStore } from "../stores";
import { useDocumentStore } from "../stores";
import { useUIStore } from "../stores";
import { captureAndSaveScreenshot } from "../utils/screenshotCaptureFlow";
import {
  ReviewTab,
  DashboardTab,
  SettingsTab,
  DocumentViewer,
  WebBrowserTab,
  RSSReader,
  DocumentQATab,
} from "./tabs/TabRegistry";
import { KnowledgeGraphPage } from "../pages/KnowledgeGraphPage";
import { KnowledgeSpherePage } from "../pages/KnowledgeSpherePage";
import { useQueueStore } from "../stores/queueStore";
import { useReviewStore } from "../stores/reviewStore";
import type { QueueItem } from "../types/queue";

import {
  FileUp,
  Link,
  BookMarked,
  Dices,
  Brain,
  Rss,
  LayoutDashboard,
  Network,
  Orbit,
  Compass,
  BotMessageSquare,
  Camera,
  Settings,
  Command,
} from "lucide-react";

interface ToolbarButton {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut: string;
  action: () => void;
  backgroundAction?: () => void; // Action for middle-click (open in background)
  disabled?: boolean;
  group: number;
}

interface ToolbarButtonProps {
  button: ToolbarButton;
}

function ToolbarButton({ button }: ToolbarButtonProps) {
  const Icon = button.icon;

  const handleAuxClick = (e: React.MouseEvent) => {
    // Middle-click (button 1)
    if (e.button === 1 && button.backgroundAction) {
      e.preventDefault();
      e.stopPropagation();
      button.backgroundAction();
    }
  };

  return (
    <button
      onClick={button.action}
      onAuxClick={handleAuxClick}
      disabled={button.disabled}
      title={`${button.label} (${button.shortcut})`}
      className={`
        relative p-2 rounded transition-colors
        hover:bg-muted hover:text-foreground
        disabled:opacity-50 disabled:cursor-not-allowed
        ${button.disabled ? "text-muted-foreground" : "text-foreground"}
      `}
      aria-label={button.label}
    >
      <Icon className="w-5 h-5" />
      <span className="sr-only">{button.label}</span>
    </button>
  );
}

export function Toolbar() {
  const addTab = useTabsStore((state) => state.addTab);
  const addTabInBackground = useTabsStore((state) => state.addTabInBackground);
  const openFilePickerAndImport = useDocumentStore((state) => state.openFilePickerAndImport);
  const loadDocuments = useDocumentStore((state) => state.loadDocuments);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const queueFilterMode = useQueueStore((state) => state.queueFilterMode);

  // Import File button
  const handleImportFile = async () => {
    await openFilePickerAndImport();
  };

  // Import URL button
  const handleImportUrl = () => {
    // TODO: Implement URL import dialog
    const url = prompt("Enter URL to import:");
    if (url) {
      console.log("Import URL:", url);
      // Will implement URL import in future
    }
  };

  // Read Next button
  const handleReadNext = async () => {
    const { loadQueue, loadDueDocumentsOnly, loadDueQueueItems } = useQueueStore.getState();
    switch (queueFilterMode) {
      case "due-today":
        await loadDueDocumentsOnly();
        break;
      case "due-all":
        await loadDueQueueItems();
        break;
      case "all-items":
      case "new-only":
      default:
        await loadQueue();
        break;
    }
    const { filteredItems } = useQueueStore.getState();
    const nextItem = filteredItems[0];
    if (!nextItem) {
      console.log("No due items to read.");
      return;
    }
    void openQueueItem(nextItem);
  };

  // Random Item button
  const handleRandomItem = async () => {
    const { loadQueue, loadDueDocumentsOnly, loadDueQueueItems } = useQueueStore.getState();
    switch (queueFilterMode) {
      case "due-today":
        await loadDueDocumentsOnly();
        break;
      case "due-all":
        await loadDueQueueItems();
        break;
      case "all-items":
      case "new-only":
      default:
        await loadQueue();
        break;
    }
    const { filteredItems } = useQueueStore.getState();
    if (filteredItems.length === 0) {
      console.log("No items available for random selection.");
      return;
    }
    const randomItem = filteredItems[Math.floor(Math.random() * filteredItems.length)];
    void openQueueItem(randomItem);
  };

  // Start Review button
  const handleStartReview = () => {
    addTab({
      title: "Review",
      icon: "🎴",
      type: "review",
      content: ReviewTab,
      closable: true,
    });
  };

  const handleStartReviewBackground = () => {
    addTabInBackground({
      title: "Review",
      icon: "🎴",
      type: "review",
      content: ReviewTab,
      closable: true,
    });
  };

  // RSS button
  const handleRss = () => {
    addTab({
      title: "RSS Feeds",
      icon: "📰",
      type: "rss",
      content: RSSReader,
      closable: true,
    });
  };

  // Dashboard button
  const handleDashboard = () => {
    addTab({
      title: "Dashboard",
      icon: "📊",
      type: "dashboard",
      content: DashboardTab,
      closable: false,
    });
  };

  // Dashboard is already the default tab, so middle-click doesn't make much sense
  // But we'll still add the handler for consistency

  // Knowledge Graph button
  const handleKnowledgeGraph = () => {
    addTab({
      title: "Knowledge Network",
      icon: "🕸️",
      type: "knowledge-network",
      content: KnowledgeGraphPage,
      closable: true,
    });
  };

  const handleKnowledgeGraphBackground = () => {
    addTabInBackground({
      title: "Knowledge Network",
      icon: "🕸️",
      type: "knowledge-network",
      content: KnowledgeGraphPage,
      closable: true,
    });
  };

  // Knowledge Sphere button (3D)
  const handleKnowledgeSphere = () => {
    addTab({
      title: "Knowledge Sphere",
      icon: "🌐",
      type: "knowledge-sphere",
      content: KnowledgeSpherePage,
      closable: true,
    });
  };

  const handleKnowledgeSphereBackground = () => {
    addTabInBackground({
      title: "Knowledge Sphere",
      icon: "🌐",
      type: "knowledge-sphere",
      content: KnowledgeSpherePage,
      closable: true,
    });
  };

  // Web Browser button
  const handleWebBrowser = () => {
    addTab({
      title: "Web Browser",
      icon: "🌐",
      type: "web-browser",
      content: WebBrowserTab,
      closable: true,
    });
  };

  const handleWebBrowserBackground = () => {
    addTabInBackground({
      title: "Web Browser",
      icon: "🌐",
      type: "web-browser",
      content: WebBrowserTab,
      closable: true,
    });
  };

  // Doc Q&A button
  const handleDocQA = () => {
    addTab({
      title: "Document Q&A",
      icon: "🤖",
      type: "doc-qa",
      content: DocumentQATab,
      closable: true,
    });
  };

  const handleDocQABackground = () => {
    addTabInBackground({
      title: "Document Q&A",
      icon: "🤖",
      type: "doc-qa",
      content: DocumentQATab,
      closable: true,
    });
  };

  // Screenshot button
  const handleScreenshot = () => {
    void captureAndSaveScreenshot()
      .then(async () => {
        await loadDocuments();
      })
      .catch((error) => {
        console.error("Failed to capture screenshot:", error);
        alert("Failed to capture screenshot. Please try again.");
      });
  };

  // Settings button
  const handleSettings = () => {
    addTab({
      title: "Settings",
      icon: "⚙️",
      type: "settings",
      content: SettingsTab,
      closable: true,
    });
  };

  const handleSettingsBackground = () => {
    addTabInBackground({
      title: "Settings",
      icon: "⚙️",
      type: "settings",
      content: SettingsTab,
      closable: true,
    });
  };

  // Command Palette button
  const handleCommandPalette = () => {
    setCommandPaletteOpen(true);
  };

  const openQueueItem = async (item: QueueItem) => {
    if (item.itemType === "document") {
      addTab({
        title: item.documentTitle,
        icon: "📄",
        type: "document-viewer",
        content: DocumentViewer,
        closable: true,
        data: { documentId: item.documentId },
      });
      return;
    }

    if (item.itemType === "extract") {
      addTab({
        title: item.documentTitle,
        icon: "📄",
        type: "document-viewer",
        content: DocumentViewer,
        closable: true,
        data: { documentId: item.documentId, initialViewMode: "extracts" },
      });
      return;
    }

    if (item.itemType === "learning-item") {
      addTab({
        title: "Review",
        icon: "🎴",
        type: "review",
        content: ReviewTab,
        closable: true,
      });
      const { startReviewAtItem } = useReviewStore.getState();
      if (item.learningItemId || item.id) {
        await startReviewAtItem(item.learningItemId || item.id);
      }
    }
  };

  const buttons: ToolbarButton[] = [
    // Group 1: File Operations
    {
      id: "import-file",
      icon: FileUp,
      label: "Import File",
      shortcut: "Ctrl+O",
      action: handleImportFile,
      group: 1,
    },
    {
      id: "import-url",
      icon: Link,
      label: "Import URL",
      shortcut: "Ctrl+Shift+O",
      action: handleImportUrl,
      group: 1,
    },
    {
      id: "read-next",
      icon: BookMarked,
      label: "Read Next",
      shortcut: "",
      action: handleReadNext,
      group: 1,
    },
    {
      id: "random-item",
      icon: Dices,
      label: "Random Item",
      shortcut: "",
      action: handleRandomItem,
      group: 1,
    },
    {
      id: "start-review",
      icon: Brain,
      label: "Start Review",
      shortcut: "",
      action: handleStartReview,
      backgroundAction: handleStartReviewBackground,
      group: 1,
    },
    // Group 2: RSS
    {
      id: "rss",
      icon: Rss,
      label: "RSS Feeds",
      shortcut: "",
      action: handleRss,
      group: 2,
    },
    // Group 3: Navigation
    {
      id: "dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      shortcut: "Ctrl+1",
      action: handleDashboard,
      group: 3,
    },
    {
      id: "knowledge-graph",
      icon: Network,
      label: "Knowledge Graph",
      shortcut: "Ctrl+4",
      action: handleKnowledgeGraph,
      backgroundAction: handleKnowledgeGraphBackground,
      group: 3,
    },
    {
      id: "knowledge-sphere",
      icon: Orbit,
      label: "Knowledge Sphere",
      shortcut: "Ctrl+5",
      action: handleKnowledgeSphere,
      backgroundAction: handleKnowledgeSphereBackground,
      group: 3,
    },
    {
      id: "web-browser",
      icon: Compass,
      label: "Web Browser",
      shortcut: "Ctrl+6",
      action: handleWebBrowser,
      backgroundAction: handleWebBrowserBackground,
      group: 3,
    },
    {
      id: "doc-qa",
      icon: BotMessageSquare,
      label: "Document Q&A",
      shortcut: "",
      action: handleDocQA,
      backgroundAction: handleDocQABackground,
      group: 3,
    },
    {
      id: "screenshot",
      icon: Camera,
      label: "Screenshot",
      shortcut: "Ctrl+Shift+S",
      action: handleScreenshot,
      group: 3,
    },
    // Group 4: Settings & Tools
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      shortcut: "Ctrl+,",
      action: handleSettings,
      backgroundAction: handleSettingsBackground,
      group: 4,
    },
    {
      id: "command-palette",
      icon: Command,
      label: "Command Palette",
      shortcut: "Ctrl+K",
      action: handleCommandPalette,
      group: 4,
    },
  ];

  // Get unique group numbers
  const groups = Array.from(new Set(buttons.map((b) => b.group))).sort();

  return (
    <div className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center px-2 py-1 gap-1">
        {groups.map((group, groupIndex) => (
          <div key={group} className="flex items-center gap-1">
            {/* Render buttons for this group */}
            {buttons
              .filter((b) => b.group === group)
              .map((button) => (
                <ToolbarButton key={button.id} button={button} />
              ))}

            {/* Add separator between groups (except after last group) */}
            {groupIndex < groups.length - 1 && (
              <div className="w-px h-6 bg-border mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
