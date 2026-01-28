import { useEffect, useMemo, useRef, useState } from "react";
import { useTabsStore, createTabPane } from "../../stores";
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
  const tabs = useTabsStore((state) => state.tabs);
  const rootPane = useTabsStore((state) => state.rootPane);
  const addTab = useTabsStore((state) => state.addTab);
  const loadTabs = useTabsStore((state) => state.loadTabs);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const updateTab = useTabsStore((state) => state.updateTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const reopenLastClosedTab = useTabsStore((state) => state.reopenLastClosedTab);
  const loadDocuments = useDocumentStore((state) => state.loadDocuments);
  const initializedRef = useRef(false);
  const [vimiumEnabled] = useVimiumEnabled();
  const documentsLoadedRef = useRef(false);
  const [activePaneTabId, setActivePaneTabId] = useState<string | null>(null);
  
  // Find the first tab pane and its active tab for keyboard navigation
  useEffect(() => {
    const findFirstTabPane = (pane: typeof rootPane): typeof rootPane | null => {
      if (pane.type === "tabs") return pane;
      if (pane.type === "split") {
        for (const child of pane.children) {
          const found = findFirstTabPane(child);
          if (found) return found;
        }
      }
      return null;
    };
    
    const firstPane = findFirstTabPane(rootPane);
    if (firstPane && firstPane.type === "tabs") {
      setActivePaneTabId(firstPane.activeTabId);
    }
  }, [rootPane]);

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
      // Load saved tabs first to check if there's a persisted layout
      loadTabs();
      
      // If still no tabs after loading, create defaults
      if (useTabsStore.getState().tabs.length === 0) {
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
      }
    }
  }, []);

  useEffect(() => {
    if (documentsLoadedRef.current) return;
    documentsLoadedRef.current = true;
    void loadDocuments();
  }, [loadDocuments]);

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
        if (activePaneTabId) closeTab(activePaneTabId);
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
        // Find first tab pane and cycle through its tabs
        const paneIds = useTabsStore.getState().getTabPaneIds();
        if (paneIds.length === 0) return;
        const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
        if (firstPane && firstPane.type === "tabs") {
          const currentIndex = firstPane.tabIds.findIndex((id) => id === firstPane.activeTabId);
          const nextIndex = (currentIndex + 1) % firstPane.tabIds.length;
          if (firstPane.tabIds[nextIndex]) {
            setActiveTab(firstPane.id, firstPane.tabIds[nextIndex]);
          }
        }
      },
    },
    {
      id: "vimium-prev-tab",
      name: "prev-tab",
      description: "Switch to the previous tab",
      action: () => {
        // Find first tab pane and cycle through its tabs
        const paneIds = useTabsStore.getState().getTabPaneIds();
        if (paneIds.length === 0) return;
        const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
        if (firstPane && firstPane.type === "tabs") {
          const currentIndex = firstPane.tabIds.findIndex((id) => id === firstPane.activeTabId);
          const prevIndex = currentIndex <= 0 ? firstPane.tabIds.length - 1 : currentIndex - 1;
          if (firstPane.tabIds[prevIndex]) {
            setActiveTab(firstPane.id, firstPane.tabIds[prevIndex]);
          }
        }
      },
      aliases: ["previous-tab"],
    },
  ]), [addTab, openWebUrl, activePaneTabId, closeTab, reopenLastClosedTab, setActiveTab]);

  const vimiumActions = useMemo(() => ({
    goBack: () => window.history.back(),
    goForward: () => window.history.forward(),
    reload: () => window.location.reload(),
    openUrl: openWebUrl,
    nextTab: () => {
      // Find first tab pane and cycle through its tabs
      const paneIds = useTabsStore.getState().getTabPaneIds();
      if (paneIds.length === 0) return;
      const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
      if (firstPane && firstPane.type === "tabs") {
        const currentIndex = firstPane.tabIds.findIndex((id) => id === firstPane.activeTabId);
        const nextIndex = (currentIndex + 1) % firstPane.tabIds.length;
        if (firstPane.tabIds[nextIndex]) {
          setActiveTab(firstPane.id, firstPane.tabIds[nextIndex]);
        }
      }
    },
    previousTab: () => {
      // Find first tab pane and cycle through its tabs
      const paneIds = useTabsStore.getState().getTabPaneIds();
      if (paneIds.length === 0) return;
      const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
      if (firstPane && firstPane.type === "tabs") {
        const currentIndex = firstPane.tabIds.findIndex((id) => id === firstPane.activeTabId);
        const prevIndex = currentIndex <= 0 ? firstPane.tabIds.length - 1 : currentIndex - 1;
        if (firstPane.tabIds[prevIndex]) {
          setActiveTab(firstPane.id, firstPane.tabIds[prevIndex]);
        }
      }
    },
    firstTab: () => {
      // Find first tab pane and select its first tab
      const paneIds = useTabsStore.getState().getTabPaneIds();
      if (paneIds.length === 0) return;
      const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
      if (firstPane && firstPane.type === "tabs" && firstPane.tabIds.length > 0) {
        setActiveTab(firstPane.id, firstPane.tabIds[0]);
      }
    },
    lastTab: () => {
      // Find first tab pane and select its last tab
      const paneIds = useTabsStore.getState().getTabPaneIds();
      if (paneIds.length === 0) return;
      const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
      if (firstPane && firstPane.type === "tabs" && firstPane.tabIds.length > 0) {
        setActiveTab(firstPane.id, firstPane.tabIds[firstPane.tabIds.length - 1]);
      }
    },
    closeTab: () => {
      if (activePaneTabId) closeTab(activePaneTabId);
    },
    restoreTab: () => reopenLastClosedTab(),
  }), [activePaneTabId, closeTab, reopenLastClosedTab, setActiveTab]);

  return (
    <MobileLayoutWrapper>
      <VimiumNavigationProvider
        enabled={vimiumEnabled}
        commands={vimiumCommands}
        actions={vimiumActions}
      >
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
          {/* Toolbar - Fixed at top - Hidden on mobile */}
          <div className="flex-shrink-0 hidden md:block">
            <Toolbar />
          </div>

          {/* Tabbed Interface - Below toolbar - must grow to fill remaining height */}
          {/* Add bottom padding on mobile for navigation bar */}
          <div className="flex-1 min-h-0 pb-0 md:pb-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} data-vimium-scroll>
            <Tabs />
          </div>

          {/* Global Command Center */}
          <CommandCenter />
        </div>
      </VimiumNavigationProvider>
    </MobileLayoutWrapper>
  );
}
