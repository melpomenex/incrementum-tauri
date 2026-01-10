import { useEffect, useRef } from "react";
import { useTabsStore } from "../../stores";
import { useDocumentStore } from "../../stores";
import { useGlobalShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useShortcut } from "../common/KeyboardShortcuts";
import { Toolbar } from "../Toolbar";
import { Tabs } from "../common/Tabs";
import { DashboardTab, QueueTab } from "../tabs/TabRegistry";
import { CommandCenter } from "../search/CommandCenter";
import { captureAndSaveScreenshot } from "../../utils/screenshotCaptureFlow";

export function MainLayout() {
  const { tabs, addTab, loadTabs } = useTabsStore();
  const { loadDocuments } = useDocumentStore();
  const initializedRef = useRef(false);

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

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Toolbar - Fixed at top */}
      <div className="flex-shrink-0">
        <Toolbar />
      </div>

      {/* Tabbed Interface - Below toolbar - must grow to fill remaining height */}
      <div className="flex-1 min-h-0">
        <Tabs />
      </div>

      {/* Global Command Center */}
      <CommandCenter />
    </div>
  );
}
