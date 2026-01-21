import { useEffect } from "react";
import { useTabsStore } from "../../../stores";
import { TabBar } from "./TabBar";
import { TabContent } from "./TabContent";

/**
 * Main Tabs container component
 * Manages tab display and integrates with the tabs store
 */
export function Tabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const moveTab = useTabsStore((state) => state.moveTab);

  // Handle keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl+Tab: Next tab
      if (ctrlOrMeta && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex]) {
          setActiveTab(tabs[nextIndex].id);
        }
      }

      // Ctrl+Shift+Tab: Previous tab
      if (ctrlOrMeta && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        const prevIndex =
          currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
        if (tabs[prevIndex]) {
          setActiveTab(tabs[prevIndex].id);
        }
      }

      // Ctrl+W: Close current tab
      if (ctrlOrMeta && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, setActiveTab, closeTab]);

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="flex-shrink-0">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={setActiveTab}
          onTabClose={closeTab}
          onTabMove={moveTab}
        />
      </div>
      <div className="flex-1 min-h-0">
        <TabContent tabs={tabs} activeTabId={activeTabId} />
      </div>
    </div>
  );
}
