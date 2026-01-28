import { useState, useRef, useEffect } from "react";
import { useTabsStore, type Tab } from "../../../stores";
import { TabContextMenu } from "./TabContextMenu";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  paneId?: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabMove?: (fromIndex: number, toIndex: number) => void;
  onDragStart?: (tabId: string) => void;
  onDragEnd?: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  paneId,
  onTabClick,
  onTabClose,
  onTabMove,
  onDragStart,
  onDragEnd,
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Handle wheel scroll for tabs
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (index: number, tabId: string, e: React.DragEvent) => {
    setDraggedIndex(index);
    
    // Set drag image
    const tabElement = e.currentTarget as HTMLElement;
    const rect = tabElement.getBoundingClientRect();
    
    // Create a ghost image
    const ghost = tabElement.cloneNode(true) as HTMLElement;
    ghost.style.position = "fixed";
    ghost.style.top = "-1000px";
    ghost.style.left = "-1000px";
    ghost.style.width = `${rect.width}px`;
    ghost.style.opacity = "0.8";
    ghost.style.transform = "scale(1.05)";
    document.body.appendChild(ghost);
    
    e.dataTransfer.setDragImage(ghost, rect.width / 2, 20);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ 
      tabId, 
      sourcePaneId: paneId,
      sourceIndex: index 
    }));
    
    // Clean up ghost after drag starts
    setTimeout(() => document.body.removeChild(ghost), 0);
    
    onDragStart?.(tabId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }
    
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    
    if (draggedIndex !== null && draggedIndex !== dropIndex && onTabMove) {
      onTabMove(draggedIndex, dropIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    onDragEnd?.();
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
          className="p-1 md:p-2 hover:bg-muted transition-colors border-r border-border min-w-[36px] md:min-w-[44px] min-h-[36px] md:min-h-[44px] flex items-center justify-center"
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
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={tab.id}
                draggable={tab.closable}
                onDragStart={(e) => handleDragStart(index, tab.id, e)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                onClick={() => onTabClick(tab.id)}
                onAuxClick={(e) => {
                  if (e.button === 1 && tab.closable) {
                    e.preventDefault();
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }
                }}
                className={`
                  relative flex items-center gap-1 md:gap-2 px-2 md:px-3 lg:px-4 py-1.5 md:py-2 cursor-pointer
                  border-r border-border border-t-2
                  transition-colors select-none min-w-fit
                  min-h-[36px] md:min-h-[44px]
                  ${isDragging ? "opacity-30" : ""}
                  ${isDragOver ? "bg-primary/10" : ""}
                  ${
                    isActive
                      ? "bg-background border-t-primary text-foreground"
                      : "bg-muted/50 border-t-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                  ${tab.closable ? "group" : ""}
                `}
                style={{ cursor: tab.closable ? "grab" : "default" }}
              >
                {/* Drag indicator line */}
                {isDragOver && draggedIndex !== null && draggedIndex > index && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary z-10" />
                )}
                {isDragOver && draggedIndex !== null && draggedIndex < index && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary z-10" />
                )}

                {/* Tab icon */}
                <span className="text-xs md:text-sm">{tab.icon}</span>

                {/* Tab title */}
                <span className="text-xs md:text-sm font-medium whitespace-nowrap">
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
                      ml-0.5 md:ml-1 w-6 h-6 md:w-5 md:h-5 flex items-center justify-center
                      rounded-sm hover:bg-destructive hover:text-destructive-foreground
                      opacity-100 md:opacity-0 md:group-hover:opacity-100
                      transition-opacity text-xs md:text-sm
                    "
                    aria-label={`Close ${tab.title}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Empty drop zone at the end */}
          {tabs.length > 0 && (
            <div
              className="flex-1 min-w-[50px] h-full"
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedIndex !== null) {
                  setDragOverIndex(tabs.length);
                }
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && onTabMove) {
                  onTabMove(draggedIndex, tabs.length);
                }
                setDragOverIndex(null);
                setDraggedIndex(null);
              }}
            />
          )}
        </div>

        {/* Right scroll button */}
        <button
          onClick={scrollRight}
          className="p-1 md:p-2 hover:bg-muted transition-colors border-l border-border min-w-[36px] md:min-w-[44px] min-h-[36px] md:min-h-[44px] flex items-center justify-center"
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
