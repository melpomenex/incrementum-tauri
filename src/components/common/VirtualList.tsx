/**
 * Virtual List Component
 * Efficiently renders large lists by only mounting visible items
 */

import { useRef, useEffect, useState, useCallback, ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  emptyState?: ReactNode;
  loading?: boolean;
  loadingComponent?: ReactNode;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className = "",
  onEndReached,
  endReachedThreshold = 200,
  emptyState,
  loading,
  loadingComponent,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const visibleItems = items.slice(startIndex, endIndex);

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);

      // Trigger end reached callback
      if (onEndReached) {
        const scrollBottom = newScrollTop + containerHeight;
        const threshold = totalHeight - endReachedThreshold;
        if (scrollBottom >= threshold) {
          onEndReached();
        }
      }
    },
    [containerHeight, totalHeight, onEndReached, endReachedThreshold]
  );

  if (items.length === 0 && emptyState) {
    return (
      <div ref={containerRef} className={`overflow-auto ${className}`}>
        {emptyState}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ willChange: "transform" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const offset = actualIndex * itemHeight;

          return (
            <div
              key={actualIndex}
              style={{
                position: "absolute",
                top: offset,
                height: itemHeight,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
      {loading && loadingComponent && (
        <div className="py-4">{loadingComponent}</div>
      )}
    </div>
  );
}

// Hook for using virtual list logic in custom implementations
export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  overscan?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const virtualItems = items.slice(startIndex, endIndex).map((item, index) => ({
    item,
    index: startIndex + index,
    style: {
      position: "absolute" as const,
      top: (startIndex + index) * itemHeight,
      height: itemHeight,
      left: 0,
      right: 0,
    },
  }));

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    containerRef,
    virtualItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex,
  };
}

/**
 * Dynamic Virtual List Component
 * For items with variable/dynamic heights
 * Uses a default item height and adjusts as content renders
 */

interface DynamicVirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  defaultItemHeight?: number;
  estimateSize?: number; // Alias for defaultItemHeight
  overscan?: number;
  className?: string;
}

export function DynamicVirtualList<T>({
  items,
  renderItem,
  defaultItemHeight = 100,
  estimateSize,
  overscan = 3,
  className = "",
}: DynamicVirtualListProps<T>) {
  const itemHeight = estimateSize || defaultItemHeight;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const [_, forceUpdate] = useState({});

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Get item height (use measured or default)
  const getItemHeight = (index: number) => {
    return itemHeightsRef.current.get(index) || itemHeight;
  };

  // Calculate positions
  const getItemOffset = (index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  };

  // Calculate total height
  const totalHeight = getItemOffset(items.length);

  // Find start index based on scroll position
  const findStartIndex = () => {
    let offset = 0;
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (offset + height > scrollTop) {
        return Math.max(0, i - overscan);
      }
      offset += height;
    }
    return 0;
  };

  // Find end index based on container height
  const findEndIndex = (startIdx: number) => {
    let offset = getItemOffset(startIdx);
    for (let i = startIdx; i < items.length; i++) {
      if (offset > scrollTop + containerHeight + overscan * itemHeight) {
        return Math.min(items.length, i + overscan);
      }
      offset += getItemHeight(i);
    }
    return items.length;
  };

  const startIndex = findStartIndex();
  const endIndex = findEndIndex(startIndex);
  const visibleItems = items.slice(startIndex, endIndex);

  // Measure item height after render
  const measureItem = (index: number, element: HTMLElement | null) => {
    if (element) {
      const height = element.getBoundingClientRect().height;
      const currentHeight = itemHeightsRef.current.get(index);
      if (currentHeight !== height) {
        itemHeightsRef.current.set(index, height);
        forceUpdate({});
      }
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ willChange: "transform" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const offset = getItemOffset(actualIndex);

          return (
            <div
              key={actualIndex}
              ref={(el) => measureItem(actualIndex, el)}
              style={{
                position: "absolute",
                top: offset,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualList;
