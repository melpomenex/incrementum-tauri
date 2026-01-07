import { useTabsStore } from "../stores";
import { useDocumentStore } from "../stores";
import { useUIStore } from "../stores";
import {
  ReviewTab,
  DashboardTab,
  SettingsTab,
  KnowledgeNetworkTab,
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
  disabled?: boolean;
  group: number;
}

interface ToolbarButtonProps {
  button: ToolbarButton;
}

function ToolbarButton({ button }: ToolbarButtonProps) {
  const Icon = button.icon;

  return (
    <button
      onClick={button.action}
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
  const { addTab } = useTabsStore();
  const { openFilePickerAndImport } = useDocumentStore();
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
    // Remove existing review tab if any
    addTab({
      title: "Review",
      icon: "🎴",
      type: "review",
      content: ReviewTab,
      closable: true,
    });
  };

  // RSS button
  const handleRss = () => {
    console.log("RSS Feeds");
    // TODO: Implement RSS management
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

  // Web Browser button
  const handleWebBrowser = () => {
    console.log("Web Browser");
    // TODO: Implement web browser tab
  };

  // Doc Q&A button
  const handleDocQA = () => {
    console.log("Document Q&A");
    // TODO: Implement document Q&A panel
  };

  // Screenshot button
  const handleScreenshot = () => {
    console.log("Screenshot");
    // TODO: Implement screenshot capture
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
      group: 3,
    },
    {
      id: "web-browser",
      icon: Globe,
      label: "Web Browser",
      shortcut: "",
      action: handleWebBrowser,
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
      shortcut: "",
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
