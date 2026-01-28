import { useState, useRef, useCallback, useEffect } from "react";
import { Pane, TabPane, SplitPane, SplitDirection, Tab } from "../../../stores/tabsStore";
import { TabBar } from "./TabBar";
import { TabContent } from "./TabContent";

interface SplitPaneContainerProps {
  pane: Pane;
  tabs: Tab[];
  onSetActiveTab: (paneId: string, tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onMoveTab: (fromIndex: number, toIndex: number, paneId: string) => void;
  onMoveTabToPane: (tabId: string, fromPaneId: string, toPaneId: string, targetIndex?: number) => void;
  onSplitPane: (paneId: string, tabId: string, direction: SplitDirection, side: "before" | "after") => void;
  onResizeSplit: (splitPaneId: string, sizes: number[]) => void;
  onCollapseSplit: (splitPaneId: string, childPaneId: string) => void;
  draggedTabId: string | null;
  draggedTabSourcePaneId: string | null;
  onDragStart: (tabId: string, sourcePaneId: string) => void;
  onDragEnd: () => void;
}

// Drop indicator position
interface DropIndicator {
  paneId: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

export function SplitPaneContainer({
  pane,
  tabs,
  onSetActiveTab,
  onCloseTab,
  onMoveTab,
  onMoveTabToPane,
  onSplitPane,
  onResizeSplit,
  onCollapseSplit,
  draggedTabId,
  draggedTabSourcePaneId,
  onDragStart,
  onDragEnd,
}: SplitPaneContainerProps) {
  if (pane.type === "split") {
    return (
      <SplitView
        pane={pane}
        tabs={tabs}
        onSetActiveTab={onSetActiveTab}
        onCloseTab={onCloseTab}
        onMoveTab={onMoveTab}
        onMoveTabToPane={onMoveTabToPane}
        onSplitPane={onSplitPane}
        onResizeSplit={onResizeSplit}
        onCollapseSplit={onCollapseSplit}
        draggedTabId={draggedTabId}
        draggedTabSourcePaneId={draggedTabSourcePaneId}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );
  }

  return (
    <TabPaneView
      pane={pane}
      tabs={tabs}
      onSetActiveTab={onSetActiveTab}
      onCloseTab={onCloseTab}
      onMoveTab={onMoveTab}
      onMoveTabToPane={onMoveTabToPane}
      onSplitPane={onSplitPane}
      draggedTabId={draggedTabId}
      draggedTabSourcePaneId={draggedTabSourcePaneId}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
}

interface SplitViewProps extends Omit<SplitPaneContainerProps, "pane"> {
  pane: SplitPane;
}

function SplitView({
  pane,
  tabs,
  onSetActiveTab,
  onCloseTab,
  onMoveTab,
  onMoveTabToPane,
  onSplitPane,
  onResizeSplit,
  onCollapseSplit,
  draggedTabId,
  draggedTabSourcePaneId,
  onDragStart,
  onDragEnd,
}: SplitViewProps) {
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startSizesRef = useRef<number[]>([]);
  const resizeIndexRef = useRef(0);

  const handleResizeStart = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizesRef.current = [...pane.sizes];
    resizeIndexRef.current = index;

    document.body.style.cursor = pane.direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [pane.sizes, pane.direction]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const delta = pane.direction === "horizontal"
        ? (e.clientX - startPosRef.current.x) / rect.width * 100
        : (e.clientY - startPosRef.current.y) / rect.height * 100;

      const newSizes = [...startSizesRef.current];
      const idx = resizeIndexRef.current;
      
      newSizes[idx] = Math.max(10, Math.min(90, newSizes[idx] + delta));
      newSizes[idx + 1] = Math.max(10, Math.min(90, 100 - newSizes[idx]));
      
      // Normalize to 100%
      const total = newSizes.reduce((a, b) => a + b, 0);
      const normalizedSizes = newSizes.map(s => s / total * 100);

      onResizeSplit(pane.id, normalizedSizes);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, pane.direction, pane.id, onResizeSplit]);

  const isHorizontal = pane.direction === "horizontal";

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? "flex-row" : "flex-col"} w-full h-full overflow-hidden`}
    >
      {pane.children.map((child, index) => (
        <div
          key={child.id}
          className="flex flex-col overflow-hidden"
          style={{ 
            flex: `0 0 ${pane.sizes[index]}%`,
            minWidth: isHorizontal ? "100px" : undefined,
            minHeight: !isHorizontal ? "100px" : undefined,
          }}
        >
          <SplitPaneContainer
            pane={child}
            tabs={tabs}
            onSetActiveTab={onSetActiveTab}
            onCloseTab={onCloseTab}
            onMoveTab={onMoveTab}
            onMoveTabToPane={onMoveTabToPane}
            onSplitPane={onSplitPane}
            onResizeSplit={onResizeSplit}
            onCollapseSplit={onCollapseSplit}
            draggedTabId={draggedTabId}
            draggedTabSourcePaneId={draggedTabSourcePaneId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          
          {/* Resize Handle */}
          {index < pane.children.length - 1 && (
            <div
              className={`
                ${isHorizontal 
                  ? "w-1 hover:w-2 cursor-col-resize border-l border-border" 
                  : "h-1 hover:h-2 cursor-row-resize border-t border-border"
                }
                bg-muted/50 hover:bg-primary/30 transition-all flex-shrink-0
                active:bg-primary/50
              `}
              onMouseDown={(e) => handleResizeStart(index, e)}
              title="Drag to resize"
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface TabPaneViewProps extends Omit<SplitPaneContainerProps, "pane" | "onResizeSplit" | "onCollapseSplit"> {
  pane: TabPane;
}

function TabPaneView({
  pane,
  tabs,
  onSetActiveTab,
  onCloseTab,
  onMoveTab,
  onMoveTabToPane,
  onSplitPane,
  draggedTabId,
  draggedTabSourcePaneId,
  onDragStart,
  onDragEnd,
}: TabPaneViewProps) {
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const paneTabs = tabs.filter((t) => pane.tabIds.includes(t.id));
  const activeTab = paneTabs.find((t) => t.id === pane.activeTabId);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTabId) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Calculate relative position for drop indicator
    const edgeThreshold = Math.min(100, width * 0.2, height * 0.2);
    
    let position: DropIndicator["position"];
    
    if (x < edgeThreshold) {
      position = "left";
    } else if (x > width - edgeThreshold) {
      position = "right";
    } else if (y < edgeThreshold) {
      position = "top";
    } else if (y > height - edgeThreshold) {
      position = "bottom";
    } else {
      position = "center";
    }

    setDropIndicator({ paneId: pane.id, position });
    setIsDraggingOver(true);
  }, [draggedTabId, pane.id]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if leaving the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDropIndicator(null);
      setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTabId || !dropIndicator) {
      setDropIndicator(null);
      setIsDraggingOver(false);
      return;
    }

    const { position } = dropIndicator;

    if (position === "center") {
      // Move tab to this pane
      if (draggedTabSourcePaneId && draggedTabSourcePaneId !== pane.id) {
        onMoveTabToPane(draggedTabId, draggedTabSourcePaneId, pane.id);
      }
    } else {
      // Split pane
      const direction = position === "left" || position === "right" ? "horizontal" : "vertical";
      const side = position === "left" || position === "top" ? "before" : "after";
      
      if (draggedTabSourcePaneId) {
        if (draggedTabSourcePaneId === pane.id) {
          // Split own pane
          onSplitPane(pane.id, draggedTabId, direction, side);
        } else {
          // Move to split of another pane
          onSplitPane(pane.id, draggedTabId, direction, side);
        }
      }
    }

    setDropIndicator(null);
    setIsDraggingOver(false);
    onDragEnd();
  }, [draggedTabId, draggedTabSourcePaneId, dropIndicator, pane.id, onMoveTabToPane, onSplitPane, onDragEnd]);

  // Get indicator styles based on position
  const getIndicatorStyles = () => {
    if (!dropIndicator || dropIndicator.paneId !== pane.id) return null;

    const baseClasses = "absolute bg-primary/50 border-2 border-primary z-50 pointer-events-none transition-all";
    
    switch (dropIndicator.position) {
      case "left":
        return `${baseClasses} left-0 top-0 bottom-0 w-1/2`;
      case "right":
        return `${baseClasses} right-0 top-0 bottom-0 w-1/2`;
      case "top":
        return `${baseClasses} top-0 left-0 right-0 h-1/2`;
      case "bottom":
        return `${baseClasses} bottom-0 left-0 right-0 h-1/2`;
      case "center":
        return `${baseClasses} inset-0 bg-primary/20`;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`
        flex flex-col h-full w-full overflow-hidden
        ${isDraggingOver ? "ring-2 ring-primary/30" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tab Bar */}
      <div className="flex-shrink-0">
        <TabBar
          tabs={paneTabs}
          activeTabId={pane.activeTabId}
          paneId={pane.id}
          onTabClick={(tabId) => onSetActiveTab(pane.id, tabId)}
          onTabClose={onCloseTab}
          onTabMove={(fromIndex, toIndex) => onMoveTab(fromIndex, toIndex, pane.id)}
          onDragStart={(tabId) => onDragStart(tabId, pane.id)}
          onDragEnd={onDragEnd}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 relative">
        {activeTab ? (
          <TabContent tabs={paneTabs} activeTabId={pane.activeTabId} />
        ) : (
          <EmptyPaneState />
        )}
        
        {/* Drop Indicator Overlay */}
        {getIndicatorStyles() && (
          <div className={getIndicatorStyles() || undefined}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium shadow-lg">
                {dropIndicator?.position === "center" ? "Move here" : `Split ${dropIndicator?.position}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyPaneState() {
  return (
    <div className="flex items-center justify-center h-full bg-background">
      <div className="text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No tabs in this pane
        </h3>
        <p className="text-muted-foreground">
          Drag a tab here to move it to this pane
        </p>
      </div>
    </div>
  );
}
