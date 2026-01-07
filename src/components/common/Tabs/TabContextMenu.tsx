import { useEffect, useRef } from "react";
import { useTabsStore } from "../../../stores";

interface TabContextMenuProps {
  tabId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function TabContextMenu({
  tabId,
  x,
  y,
  onClose,
}: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { closeTab, closeOtherTabs, closeTabsToRight, tabs } = useTabsStore();

  // Close menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const tabIndex = tabs.findIndex((t) => t.id === tabId);
  const tab = tabs[tabIndex];
  const hasClosableTabsToRight = tabs
    .slice(tabIndex + 1)
    .some((t) => t.closable);
  const hasOtherClosableTabs = tabs.some(
    (t) => t.id !== tabId && t.closable
  );

  const handleClose = () => {
    closeTab(tabId);
    onClose();
  };

  const handleCloseOthers = () => {
    closeOtherTabs(tabId);
    onClose();
  };

  const handleCloseToRight = () => {
    closeTabsToRight(tabId);
    onClose();
  };

  // Position menu to stay within viewport
  const menuStyle = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 200),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-card border border-border rounded-lg shadow-lg py-1"
      style={menuStyle}
    >
      {/* Close */}
      <button
        onClick={handleClose}
        disabled={!tab?.closable}
        className={`
          w-full px-4 py-2 text-left text-sm
          hover:bg-muted hover:text-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between gap-4
        `}
      >
        <span>Close</span>
        <span className="text-xs text-muted-foreground">Ctrl+W</span>
      </button>

      {/* Close Others */}
      <button
        onClick={handleCloseOthers}
        disabled={!hasOtherClosableTabs}
        className={`
          w-full px-4 py-2 text-left text-sm
          hover:bg-muted hover:text-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        Close Others
      </button>

      {/* Close to Right */}
      <button
        onClick={handleCloseToRight}
        disabled={!hasClosableTabsToRight}
        className={`
          w-full px-4 py-2 text-left text-sm
          hover:bg-muted hover:text-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        Close Tabs to Right
      </button>

      <div className="my-1 border-t border-border" />

      {/* Close All */}
      <button
        onClick={() => {
          useTabsStore.getState().closeAllTabs();
          onClose();
        }}
        className="
          w-full px-4 py-2 text-left text-sm
          hover:bg-destructive hover:text-destructive-foreground
          flex items-center justify-between gap-4
        "
      >
        <span>Close All Tabs</span>
      </button>
    </div>
  );
}
