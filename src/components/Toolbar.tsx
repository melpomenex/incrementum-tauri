import { useTabsStore } from "../stores";
import { useDocumentStore } from "../stores";
import { useUIStore } from "../stores";
import { captureAndSaveScreenshot } from "../utils/screenshotCaptureFlow";
import {
  ReviewTab,
  DashboardTab,
  SettingsTab,
  KnowledgeNetworkTab,
  KnowledgeSphereTab,
  WebBrowserTab,
  RssTab,
} from "./tabs/TabRegistry";

import {
  FileText,
  Link,
  SkipForward,
  Shuffle,
  Repeat,
  Rss,
  LayoutDashboard,
  Network,
  Globe,
  MessageSquare,
  Camera,
  Settings,
  Search,
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
  const { addTab, addTabInBackground } = useTabsStore();
  const { openFilePickerAndImport, loadDocuments } = useDocumentStore();
  const { setCommandPaletteOpen } = useUIStore();

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
  const handleReadNext = () => {
    // TODO: Get next item from queue
    console.log("Read Next");
  };

  // Random Item button
  const handleRandomItem = () => {
    console.log("Random Item");
    // TODO: Implement random queue item
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
    console.log("RSS button clicked - opening RSS tab");
    console.log("RssTab component:", RssTab);
    addTab({
      title: "RSS Feeds",
      icon: "📰",
      type: "rss",
      content: RssTab,
      closable: true,
    });
  };

  const handleRssBackground = () => {
    addTabInBackground({
      title: "RSS Feeds",
      icon: "📰",
      type: "rss",
      content: RssTab,
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
      content: KnowledgeNetworkTab,
      closable: true,
    });
  };

  const handleKnowledgeGraphBackground = () => {
    addTabInBackground({
      title: "Knowledge Network",
      icon: "🕸️",
      type: "knowledge-network",
      content: KnowledgeNetworkTab,
      closable: true,
    });
  };

  // Knowledge Sphere button (3D)
  const handleKnowledgeSphere = () => {
    addTab({
      title: "Knowledge Sphere",
      icon: "🌐",
      type: "knowledge-sphere",
      content: KnowledgeSphereTab,
      closable: true,
    });
  };

  const handleKnowledgeSphereBackground = () => {
    addTabInBackground({
      title: "Knowledge Sphere",
      icon: "🌐",
      type: "knowledge-sphere",
      content: KnowledgeSphereTab,
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
    console.log("Document Q&A");
    // TODO: Implement document Q&A panel
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

  const buttons: ToolbarButton[] = [
    // Group 1: File Operations
    {
      id: "import-file",
      icon: FileText,
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
      icon: SkipForward,
      label: "Read Next",
      shortcut: "",
      action: handleReadNext,
      group: 1,
    },
    {
      id: "random-item",
      icon: Shuffle,
      label: "Random Item",
      shortcut: "",
      action: handleRandomItem,
      group: 1,
    },
    {
      id: "start-review",
      icon: Repeat,
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
      backgroundAction: handleRssBackground,
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
      icon: Globe,
      label: "Knowledge Sphere",
      shortcut: "Ctrl+5",
      action: handleKnowledgeSphere,
      backgroundAction: handleKnowledgeSphereBackground,
      group: 3,
    },
    {
      id: "web-browser",
      icon: Globe,
      label: "Web Browser",
      shortcut: "Ctrl+6",
      action: handleWebBrowser,
      backgroundAction: handleWebBrowserBackground,
      group: 3,
    },
    {
      id: "doc-qa",
      icon: MessageSquare,
      label: "Document Q&A",
      shortcut: "",
      action: handleDocQA,
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
      icon: Search,
      label: "Command Palette",
      shortcut: "Ctrl+Shift+P",
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
