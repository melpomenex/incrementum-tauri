import { useRef, useMemo, useCallback, ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  estimateSize?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = "",
  estimateSize = 80,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const getItemHeight = useCallback(
    (index: number): number => {
      if (typeof itemHeight === "function") {
        return itemHeight(items[index], index);
      }
      return itemHeight;
    },
    [items, itemHeight]
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getItemHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={`overflow-auto ${className}`}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Dynamic height version for variable-height items
export function DynamicVirtualList<T>({
  items,
  renderItem,
  overscan = 5,
  className = "",
  estimateSize = 80,
}: Omit<VirtualListProps<T>, "itemHeight">) {
  const parentRef = useRef<HTMLDivElement>(null);
  const supportsResizeObserver = typeof ResizeObserver !== "undefined";
  if (!supportsResizeObserver) {
    return (
      <div ref={parentRef} className={`overflow-auto ${className}`} style={{ height: "100%" }}>
        <div className="space-y-4 p-1">
          {items.map((item, index) => (
            <div key={index}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div ref={parentRef} className={`overflow-auto ${className}`} style={{ height: "100%" }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={(node) => {
              if (node) {
                rowVirtualizer.measureElement(node);
              }
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
