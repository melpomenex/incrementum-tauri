import { useEffect, useRef } from "react";
import { useTabsStore } from "../../stores";
import { useGlobalShortcuts } from "../../hooks/useKeyboardShortcuts";
import { Toolbar } from "../Toolbar";
import { Tabs } from "../common/Tabs";
import { DashboardTab, QueueTab } from "../tabs/TabRegistry";

export function MainLayout() {
  const { tabs, addTab, loadTabs } = useTabsStore();
  const initializedRef = useRef(false);

  // Setup keyboard shortcuts
  useGlobalShortcuts();

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
      <Toolbar />

      {/* Tabbed Interface - Below toolbar */}
      <Tabs />
    </div>
  );
}
