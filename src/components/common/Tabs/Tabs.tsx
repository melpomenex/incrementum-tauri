import { useEffect } from "react";
import { useTabsStore } from "../../../stores";
import { TabBar } from "./TabBar";
import { TabContent } from "./TabContent";

/**
 * Main Tabs container component
 * Manages tab display and integrates with the tabs store
 */
export function Tabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, moveTab } = useTabsStore();

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
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTab}
        onTabClose={closeTab}
        onTabMove={moveTab}
      />
      <TabContent tabs={tabs} activeTabId={activeTabId} />
    </div>
  );
}
