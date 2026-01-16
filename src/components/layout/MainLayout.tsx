import { useEffect, useMemo, useRef } from "react";
import { useTabsStore } from "../../stores";
import { useDocumentStore } from "../../stores";
import { useGlobalShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useShortcut } from "../common/KeyboardShortcuts";
import { VimiumNavigationProvider, useVimiumEnabled, type VimiumCommand } from "../common/VimiumNavigation";
import { Toolbar } from "../Toolbar";
import { Tabs } from "../common/Tabs";
import { DashboardTab, QueueTab, DocumentsTab, ReviewTab, AnalyticsTab, SettingsTab, WebBrowserTab } from "../tabs/TabRegistry";
import { CommandCenter } from "../search/CommandCenter";
import { captureAndSaveScreenshot } from "../../utils/screenshotCaptureFlow";
import { MobileLayoutWrapper } from "../mobile/MobileLayoutWrapper";

export function MainLayout() {
  const { tabs, addTab, loadTabs, activeTabId, setActiveTab, updateTab, closeTab, reopenLastClosedTab } = useTabsStore();
  const { loadDocuments } = useDocumentStore();
  const initializedRef = useRef(false);
  const [vimiumEnabled] = useVimiumEnabled();

  // Setup keyboard shortcuts
  useGlobalShortcuts();
  useShortcut("gen.screenshot", (event) => {
    const target = event.target as HTMLElement;
    const isInput =
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable;
    if (isInput) return;
    void captureAndSaveScreenshot().then(() => loadDocuments());
  });

  // Initialize default tabs on first mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // If no tabs exist, create default tabs
    if (tabs.length === 0) {
      // Add Dashboard tab (non-closable)
      addTab({
        title: "Dashboard",
        icon: "📊",
        type: "dashboard",
        content: DashboardTab,
        closable: false,
      });

      // Add Queue tab (closable)
      addTab({
        title: "Queue",
        icon: "📚",
        type: "queue",
        content: QueueTab,
        closable: true,
      });
    } else {
      // Load saved tabs from localStorage if any
      loadTabs();
    }
  }, []);

  const resolveUrl = (inputUrl: string) => {
    if (!inputUrl.trim()) return "";
    if (inputUrl.startsWith("http://") || inputUrl.startsWith("https://")) {
      return inputUrl;
    }
    if (inputUrl.includes(" ")) {
      return `https://www.google.com/search?q=${encodeURIComponent(inputUrl)}`;
    }
    return `https://${inputUrl}`;
  };

  const openWebUrl = (inputUrl: string, newTab: boolean) => {
    const formatted = resolveUrl(inputUrl);
    if (!formatted) return;

    if (!newTab && activeTabId) {
      const activeTab = tabs.find((tab) => tab.id === activeTabId);
      if (activeTab?.type === "web-browser") {
        updateTab(activeTab.id, {
          data: { ...(activeTab.data || {}), initialUrl: formatted },
        });
        return;
      }
    }

    addTab({
      title: "Web Browser",
      icon: "🌐",
      type: "web-browser",
      content: WebBrowserTab,
      closable: true,
      data: { initialUrl: formatted },
    });
  };

  const vimiumCommands = useMemo<VimiumCommand[]>(() => ([
    {
      id: "vimium-open",
      name: "open",
      description: "Open a URL in the current tab",
      action: (args) => openWebUrl(args.join(" "), false),
      aliases: ["o"],
    },
    {
      id: "vimium-tab",
      name: "tab",
      description: "Open a URL in a new tab",
      action: (args) => openWebUrl(args.join(" "), true),
      aliases: ["t"],
    },
    {
      id: "vimium-dashboard",
      name: "dashboard",
      description: "Go to Dashboard",
      action: (_args) => addTab({
        title: "Dashboard",
        icon: "📊",
        type: "dashboard",
        content: DashboardTab,
        closable: false,
      }),
    },
    {
      id: "vimium-documents",
      name: "documents",
      description: "Go to Documents",
      action: (_args) => addTab({
        title: "Documents",
        icon: "📂",
        type: "documents",
        content: DocumentsTab,
        closable: true,
      }),
    },
    {
      id: "vimium-queue",
      name: "queue",
      description: "Go to Queue",
      action: (_args) => addTab({
        title: "Queue",
        icon: "📚",
        type: "queue",
        content: QueueTab,
        closable: true,
      }),
    },
    {
      id: "vimium-review",
      name: "review",
      description: "Start Review",
      action: (_args) => addTab({
        title: "Review",
        icon: "🧠",
        type: "review",
        content: ReviewTab,
        closable: true,
      }),
    },
    {
      id: "vimium-analytics",
      name: "analytics",
      description: "Open Statistics",
      action: (_args) => addTab({
        title: "Statistics",
        icon: "📈",
        type: "analytics",
        content: AnalyticsTab,
        closable: true,
      }),
    },
    {
      id: "vimium-settings",
      name: "settings",
      description: "Open Settings",
      action: (_args) => addTab({
        title: "Settings",
        icon: "⚙️",
        type: "settings",
        content: SettingsTab,
        closable: true,
      }),
    },
    {
      id: "vimium-close-tab",
      name: "close-tab",
      description: "Close the active tab",
      action: () => {
        if (activeTabId) closeTab(activeTabId);
      },
      aliases: ["close"],
    },
    {
      id: "vimium-restore-tab",
      name: "restore-tab",
      description: "Reopen the last closed tab",
      action: () => reopenLastClosedTab(),
      aliases: ["reopen"],
    },
    {
      id: "vimium-next-tab",
      name: "next-tab",
      description: "Switch to the next tab",
      action: () => {
        if (tabs.length === 0 || !activeTabId) return;
        const index = tabs.findIndex((tab) => tab.id === activeTabId);
        const next = tabs[(index + 1) % tabs.length];
        if (next) setActiveTab(next.id);
      },
    },
    {
      id: "vimium-prev-tab",
      name: "prev-tab",
      description: "Switch to the previous tab",
      action: () => {
        if (tabs.length === 0 || !activeTabId) return;
        const index = tabs.findIndex((tab) => tab.id === activeTabId);
        const prev = tabs[(index - 1 + tabs.length) % tabs.length];
        if (prev) setActiveTab(prev.id);
      },
      aliases: ["previous-tab"],
    },
  ]), [addTab, openWebUrl, activeTabId, closeTab, reopenLastClosedTab, tabs, setActiveTab]);

  const vimiumActions = useMemo(() => ({
    goBack: () => window.history.back(),
    goForward: () => window.history.forward(),
    reload: () => window.location.reload(),
    openUrl: openWebUrl,
    nextTab: () => {
      if (tabs.length === 0 || !activeTabId) return;
      const index = tabs.findIndex((tab) => tab.id === activeTabId);
      if (index === -1) return;
      const next = tabs[(index + 1) % tabs.length];
      if (next) setActiveTab(next.id);
    },
    previousTab: () => {
      if (tabs.length === 0 || !activeTabId) return;
      const index = tabs.findIndex((tab) => tab.id === activeTabId);
      if (index === -1) return;
      const prev = tabs[(index - 1 + tabs.length) % tabs.length];
      if (prev) setActiveTab(prev.id);
    },
    firstTab: () => {
      if (tabs.length > 0) setActiveTab(tabs[0].id);
    },
    lastTab: () => {
      if (tabs.length > 0) setActiveTab(tabs[tabs.length - 1].id);
    },
    closeTab: () => {
      if (activeTabId) closeTab(activeTabId);
    },
    restoreTab: () => reopenLastClosedTab(),
  }), [tabs, activeTabId, setActiveTab, closeTab, reopenLastClosedTab]);

  return (
    <MobileLayoutWrapper>
      <VimiumNavigationProvider
        enabled={vimiumEnabled}
        commands={vimiumCommands}
        actions={vimiumActions}
      >
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
          {/* Toolbar - Fixed at top */}
          <div className="flex-shrink-0">
            <Toolbar />
          </div>

          {/* Tabbed Interface - Below toolbar - must grow to fill remaining height */}
          <div className="flex-1 min-h-0" data-vimium-scroll>
            <Tabs />
          </div>

          {/* Global Command Center */}
          <CommandCenter />
        </div>
      </VimiumNavigationProvider>
    </MobileLayoutWrapper>
  );
}
