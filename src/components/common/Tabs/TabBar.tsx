import { useState, useRef, useEffect } from "react";
import { useTabsStore, type Tab } from "../../../stores";
import { TabContextMenu } from "./TabContextMenu";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabMove?: (fromIndex: number, toIndex: number) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabMove,
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleContextMenu = (
    e: React.MouseEvent,
    tabId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex && onTabMove) {
      onTabMove(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  return (
    <>
      <div className="flex items-center bg-card border-b border-border">
        {/* Left scroll button */}
        <button
          onClick={scrollLeft}
          className="p-2 hover:bg-muted transition-colors border-r border-border"
          aria-label="Scroll tabs left"
        >
          ◀
        </button>

        {/* Tab scroll container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-center overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTabId;
            const isDragging = draggedIndex === index;

            return (
              <div
                key={tab.id}
                draggable={tab.closable}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                onClick={() => onTabClick(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2 cursor-pointer
                  border-r border-border border-t-2
                  transition-colors select-none min-w-fit
                  ${isDragging ? "opacity-50" : ""}
                  ${
                    isActive
                      ? "bg-background border-t-primary text-foreground"
                      : "bg-muted/50 border-t-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                  ${tab.closable ? "group" : ""}
                `}
                style={{ cursor: tab.closable ? "grab" : "default" }}
              >
                {/* Tab icon */}
                <span className="text-sm">{tab.icon}</span>

                {/* Tab title */}
                <span className="text-sm font-medium whitespace-nowrap">
                  {tab.title}
                </span>

                {/* Close button */}
                {tab.closable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className="
                      ml-1 w-5 h-5 flex items-center justify-center
                      rounded-sm hover:bg-destructive hover:text-destructive-foreground
                      opacity-0 group-hover:opacity-100
                      transition-opacity
                    "
                    aria-label={`Close ${tab.title}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right scroll button */}
        <button
          onClick={scrollRight}
          className="p-2 hover:bg-muted transition-colors border-l border-border"
          aria-label="Scroll tabs right"
        >
          ▶
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
