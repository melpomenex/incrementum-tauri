/**
 * Dock widget system for movable, resizable panels
 */

import { useState, useRef, useCallback, useEffect, ReactNode } from "react";

/**
 * Dock position
 */
export enum DockPosition {
  Left = "left",
  Right = "right",
  Top = "top",
  Bottom = "bottom",
  Floating = "floating",
}

/**
 * Dock widget state
 */
export interface DockWidget {
  id: string;
  title: string;
  content: ReactNode;
  position: DockPosition;
  size: number;
  minSize?: number;
  maxSize?: number;
  floating?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  collapsed?: boolean;
  closable?: boolean;
  visible?: boolean;
}

/**
 * Dock layout configuration
 */
export interface DockLayout {
  widgets: DockWidget[];
  activeWidget?: string;
}

/**
 * Dock widget component
 */
export function DockWidget({
  widget,
  isActive,
  onFocus,
  onClose,
  onResize,
  onMove,
  onToggleCollapse,
}: {
  widget: DockWidget;
  isActive: boolean;
  onFocus: () => void;
  onClose?: () => void;
  onResize?: (size: number) => void;
  onMove?: (x: number, y: number) => void;
  onToggleCollapse?: () => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (widget.position !== DockPosition.Floating) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - (widget.floating?.x || 0), y: e.clientY - (widget.floating?.y || 0) });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && widgetRef.current && onResize) {
        const rect = widgetRef.current.getBoundingClientRect();
        let newSize = 0;

        switch (widget.position) {
          case DockPosition.Left:
            newSize = e.clientX - rect.left;
            break;
          case DockPosition.Right:
            newSize = rect.right - e.clientX;
            break;
          case DockPosition.Top:
            newSize = e.clientY - rect.top;
            break;
          case DockPosition.Bottom:
            newSize = rect.bottom - e.clientY;
            break;
        }

        if (widget.minSize && newSize < widget.minSize) newSize = widget.minSize;
        if (widget.maxSize && newSize > widget.maxSize) newSize = widget.maxSize;

        onResize(newSize);
      }

      if (isDragging && onMove) {
        onMove(e.clientX - dragStart.x, e.clientY - dragStart.y);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsDragging(false);
    };

    if (isResizing || isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, isDragging, widget, dragStart, onResize, onMove]);

  if (!widget.visible && widget.visible !== undefined) return null;

  const isFloating = widget.position === DockPosition.Floating;
  const isCollapsed = widget.collapsed;

  const containerStyle: React.CSSProperties = isFloating
    ? {
        position: "fixed",
        left: widget.floating?.x || 0,
        top: widget.floating?.y || 0,
        width: widget.floating?.width || 300,
        height: widget.floating?.height || 400,
        zIndex: isActive ? 1000 : 999,
      }
    : {};

  const sizeStyle: React.CSSProperties = !isFloating
    ? {
        [widget.position === DockPosition.Left || widget.position === DockPosition.Right
          ? "width"
          : "height"]: isCollapsed ? undefined : `${widget.size}px`,
      }
    : {};

  return (
    <div
      ref={widgetRef}
      className={`dock-widget ${isFloating ? "floating" : "docked"} ${widget.position} ${
        isActive ? "active" : ""
      } ${isCollapsed ? "collapsed" : ""}`}
      style={{
        ...containerStyle,
        ...sizeStyle,
      }}
      onClick={onFocus}
    >
      {/* Header */}
      <div
        className="dock-widget-header flex items-center gap-2 px-3 py-2 bg-muted border-b border-border cursor-move"
        onMouseDown={handleDragStart}
      >
        <span className="flex-1 text-sm font-medium">{widget.title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
            className="p-1 hover:bg-muted-foreground/10 rounded"
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
          {widget.closable !== false && onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="dock-widget-content flex-1 overflow-auto p-2">{widget.content}</div>
      )}

      {/* Resize handle */}
      {!isFloating && !isCollapsed && (
        <div
          className={`dock-resize-handle resize-${widget.position}`}
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}

/**
 * Dock layout manager
 */
export function DockLayout({
  layout,
  onUpdate,
  children,
}: {
  layout: DockLayout;
  onUpdate?: (layout: DockLayout) => void;
  children?: ReactNode;
}) {
  const [activeWidget, setActiveWidget] = useState(layout.activeWidget);

  const updateWidget = useCallback(
    (id: string, updates: Partial<DockWidget>) => {
      if (!onUpdate) return;
      const widgets = layout.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w));
      onUpdate({ widgets, activeWidget });
    },
    [layout, activeWidget, onUpdate]
  );

  const handleResize = useCallback(
    (id: string, size: number) => {
      updateWidget(id, { size });
    },
    [updateWidget]
  );

  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      const widget = layout.widgets.find((w) => w.id === id);
      if (!widget || !widget.floating) return;
      updateWidget(id, { floating: { ...widget.floating, x, y } });
    },
    [layout, updateWidget]
  );

  const handleClose = useCallback(
    (id: string) => {
      updateWidget(id, { visible: false });
    },
    [updateWidget]
  );

  const handleToggleCollapse = useCallback(
    (id: string) => {
      const widget = layout.widgets.find((w) => w.id === id);
      if (widget) {
        updateWidget(id, { collapsed: !widget.collapsed });
      }
    },
    [layout, updateWidget]
  );

  const handleFocus = useCallback((id: string) => {
    setActiveWidget(id);
    if (onUpdate) {
      onUpdate({ ...layout, activeWidget: id });
    }
  }, []);

  // Group widgets by position
  const leftWidgets = layout.widgets.filter((w) => w.position === DockPosition.Left && w.visible !== false);
  const rightWidgets = layout.widgets.filter((w) => w.position === DockPosition.Right && w.visible !== false);
  const topWidgets = layout.widgets.filter((w) => w.position === DockPosition.Top && w.visible !== false);
  const bottomWidgets = layout.widgets.filter((w) => w.position === DockPosition.Bottom && w.visible !== false);
  const floatingWidgets = layout.widgets.filter((w) => w.position === DockPosition.Floating && w.visible !== false);

  return (
    <div className="dock-layout">
      {/* Top widgets */}
      {topWidgets.length > 0 && (
        <div className="dock-container-top flex flex-row border-b border-border">
          {topWidgets.map((widget) => (
            <DockWidget
              key={widget.id}
              widget={widget}
              isActive={activeWidget === widget.id}
              onFocus={() => handleFocus(widget.id)}
              onClose={() => handleClose(widget.id)}
              onToggleCollapse={() => handleToggleCollapse(widget.id)}
            />
          ))}
        </div>
      )}

      <div className="dock-middle flex flex-1">
        {/* Left widgets */}
        {leftWidgets.length > 0 && (
          <div className="dock-container-left flex flex-col border-r border-border">
            {leftWidgets.map((widget) => (
              <DockWidget
                key={widget.id}
                widget={widget}
                isActive={activeWidget === widget.id}
                onFocus={() => handleFocus(widget.id)}
                onResize={(size) => handleResize(widget.id, size)}
                onClose={() => handleClose(widget.id)}
                onToggleCollapse={() => handleToggleCollapse(widget.id)}
              />
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="dock-main flex-1 overflow-auto">{children}</div>

        {/* Right widgets */}
        {rightWidgets.length > 0 && (
          <div className="dock-container-right flex flex-col border-l border-border">
            {rightWidgets.map((widget) => (
              <DockWidget
                key={widget.id}
                widget={widget}
                isActive={activeWidget === widget.id}
                onFocus={() => handleFocus(widget.id)}
                onResize={(size) => handleResize(widget.id, size)}
                onClose={() => handleClose(widget.id)}
                onToggleCollapse={() => handleToggleCollapse(widget.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom widgets */}
      {bottomWidgets.length > 0 && (
        <div className="dock-container-bottom flex flex-row border-t border-border">
          {bottomWidgets.map((widget) => (
            <DockWidget
              key={widget.id}
              widget={widget}
              isActive={activeWidget === widget.id}
              onFocus={() => handleFocus(widget.id)}
              onClose={() => handleClose(widget.id)}
              onToggleCollapse={() => handleToggleCollapse(widget.id)}
            />
          ))}
        </div>
      )}

      {/* Floating widgets */}
      {floatingWidgets.map((widget) => (
        <DockWidget
          key={widget.id}
          widget={widget}
          isActive={activeWidget === widget.id}
          onFocus={() => handleFocus(widget.id)}
          onMove={(x, y) => handleMove(widget.id, x, y)}
          onClose={() => handleClose(widget.id)}
          onToggleCollapse={() => handleToggleCollapse(widget.id)}
        />
      ))}
    </div>
  );
}

/**
 * Hook to manage dock layout
 */
export function useDockLayout(initialLayout?: DockLayout) {
  const [layout, setLayout] = useState<DockLayout>(
    initialLayout || {
      widgets: [],
    }
  );

  const addWidget = useCallback((widget: Omit<DockWidget, "id">) => {
    const id = `dock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setLayout((prev) => ({
      ...prev,
      widgets: [...prev.widgets, { ...widget, id }],
    }));
    return id;
  }, []);

  const removeWidget = useCallback((id: string) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== id),
      activeWidget: prev.activeWidget === id ? undefined : prev.activeWidget,
    }));
  }, []);

  const updateWidget = useCallback((id: string, updates: Partial<DockWidget>) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    }));
  }, []);

  return { layout, setLayout, addWidget, removeWidget, updateWidget, toggleWidget };
}

/**
 * Quick dock widget helper
 */
export function DockPanel({
  title,
  children,
  position = DockPosition.Left,
  size = 300,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  position?: DockPosition;
  size?: number;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!isOpen) return null;

  return (
    <div
      className={`dock-panel dock-panel-${position}`}
      style={{
        width: position === DockPosition.Left || position === DockPosition.Right ? size : undefined,
        height: position === DockPosition.Top || position === DockPosition.Bottom ? size : undefined,
      }}
    >
      <div className="dock-panel-header flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
        <span className="text-sm font-medium">{title}</span>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted-foreground/10 rounded"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="dock-panel-content p-2 overflow-auto">{children}</div>
    </div>
  );
}
