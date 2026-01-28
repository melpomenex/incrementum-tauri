import { useEffect, useState, useCallback } from "react";
import { useTabsStore, SplitDirection } from "../../../stores";
import { SplitPaneContainer } from "./SplitPaneContainer";

/**
 * Main Tabs container component with split pane support
 * Manages tab display and integrates with the tabs store
 */
export function Tabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const rootPane = useTabsStore((state) => state.rootPane);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const moveTab = useTabsStore((state) => state.moveTab);
  const moveTabToPane = useTabsStore((state) => state.moveTabToPane);
  const splitPane = useTabsStore((state) => state.splitPane);
  const resizeSplit = useTabsStore((state) => state.resizeSplit);
  const collapseSplit = useTabsStore((state) => state.collapseSplit);

  // Drag state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [draggedTabSourcePaneId, setDraggedTabSourcePaneId] = useState<string | null>(null);

  const handleDragStart = useCallback((tabId: string, sourcePaneId: string) => {
    setDraggedTabId(tabId);
    setDraggedTabSourcePaneId(sourcePaneId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDraggedTabSourcePaneId(null);
  }, []);

  // Prevent file drop glitches when dragging tabs
  useEffect(() => {
    if (!draggedTabId) return;

    // When dragging tabs, prevent default file drop behavior on document
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "none";
    };

    const handleDrop = (e: DragEvent) => {
      // Only prevent default if it's not handled by our tab system
      // Check if the drop target is inside a tab pane
      const target = e.target as HTMLElement;
      const isTabDrop = target.closest("[data-tab-pane]");
      if (!isTabDrop) {
        e.preventDefault();
      }
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
    };

    // Add listeners to document to catch all drag events outside tab areas
    document.addEventListener("dragover", handleDragOver, true);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("dragenter", handleDragEnter, true);
    document.addEventListener("dragleave", handleDragLeave, true);

    return () => {
      document.removeEventListener("dragover", handleDragOver, true);
      document.removeEventListener("drop", handleDrop, true);
      document.removeEventListener("dragenter", handleDragEnter, true);
      document.removeEventListener("dragleave", handleDragLeave, true);
    };
  }, [draggedTabId]);

  // Handle keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl+Tab: Next tab in current pane
      if (ctrlOrMeta && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        // Find the currently focused pane and cycle through its tabs
        const paneIds = useTabsStore.getState().getTabPaneIds();
        // For now, cycle through first pane's tabs
        const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
        if (firstPane && firstPane.type === "tabs") {
          const currentIndex = firstPane.tabIds.findIndex((id) => id === firstPane.activeTabId);
          const nextIndex = (currentIndex + 1) % firstPane.tabIds.length;
          if (firstPane.tabIds[nextIndex]) {
            setActiveTab(firstPane.id, firstPane.tabIds[nextIndex]);
          }
        }
      }

      // Ctrl+Shift+Tab: Previous tab in current pane
      if (ctrlOrMeta && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const paneIds = useTabsStore.getState().getTabPaneIds();
        const firstPane = useTabsStore.getState().findPaneById(paneIds[0]);
        if (firstPane && firstPane.type === "tabs") {
          const currentIndex = firstPane.tabIds.findIndex((id) => id === firstPane.activeTabId);
          const prevIndex = currentIndex <= 0 ? firstPane.tabIds.length - 1 : currentIndex - 1;
          if (firstPane.tabIds[prevIndex]) {
            setActiveTab(firstPane.id, firstPane.tabIds[prevIndex]);
          }
        }
      }

      // Ctrl+W: Close current tab
      if (ctrlOrMeta && e.key === "w") {
        e.preventDefault();
        // Find active tab in any pane
        const paneIds = useTabsStore.getState().getTabPaneIds();
        for (const paneId of paneIds) {
          const pane = useTabsStore.getState().findPaneById(paneId);
          if (pane && pane.type === "tabs" && pane.activeTabId) {
            closeTab(pane.activeTabId);
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTab, closeTab]);

  // If no root pane or empty, show empty state
  if (!rootPane || (rootPane.type === "tabs" && rootPane.tabIds.length === 0 && tabs.length === 0)) {
    return (
      <div className="flex flex-col h-full w-full bg-background">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <SplitPaneContainer
          pane={rootPane}
          tabs={tabs}
          onSetActiveTab={setActiveTab}
          onCloseTab={closeTab}
          onMoveTab={moveTab}
          onMoveTabToPane={moveTabToPane}
          onSplitPane={splitPane}
          onResizeSplit={resizeSplit}
          onCollapseSplit={collapseSplit}
          draggedTabId={draggedTabId}
          draggedTabSourcePaneId={draggedTabSourcePaneId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No tabs open
        </h3>
        <p className="text-muted-foreground mb-6">
          Open a tab to get started
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "/dashboard" }))}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            Open Dashboard
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "/documents" }))}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition-opacity"
          >
            Open Documents
          </button>
        </div>
      </div>
    </div>
  );
}
