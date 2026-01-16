/**
 * Pull to Refresh Component
 *
 * Provides pull-to-refresh functionality for mobile PWA
 * with visual feedback and smooth animations
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw, Check, AlertCircle } from "lucide-react";

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number; // Distance in pixels to trigger refresh
  pullMax?: number; // Maximum pull distance in pixels
  refreshDuration?: number; // How long refresh takes in ms
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  disabled = false,
  threshold = 80,
  pullMax = 120,
  refreshDuration = 2000,
  children,
  className = "",
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    // Only trigger on single touch (not pinch zoom)
    if (e.touches.length === 1 && !refreshing) {
      const touch = e.touches[0];
      // Only trigger if at the top of the scroll container
      const target = e.target as HTMLElement;
      const scrollContainer = target.closest('[data-scroll-container]') as HTMLElement || document.documentElement;

      if (scrollContainer.scrollTop <= 0) {
        isDragging.current = true;
        startY.current = touch.clientY;
        currentY.current = touch.clientY;
      }
    }
  }, [disabled, refreshing]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || disabled) return;

    const y = e.touches[0].clientY;
    const deltaY = y - startY.current;

    // Only allow pulling down
    if (deltaY > 0) {
      // Calculate pull distance with resistance
      const distance = Math.min(deltaY * 0.5, pullMax);
      setPullDistance(distance);
    } else {
      // Reset when pulling up
      setPullDistance(0);
    }

    currentY.current = y;
  }, [disabled, pullMax]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;

    if (pullDistance >= threshold && !refreshing) {
      // Trigger refresh
      performRefresh();
    } else {
      // Reset without refreshing
      setPullDistance(0);
    }

    startY.current = 0;
    currentY.current = 0;
  }, [pullDistance, threshold, refreshing]);

  // Perform the refresh operation
  const performRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullDistance(threshold); // Show loading indicator
    setRefreshSuccess(false);
    setRefreshError(false);

    try {
      await onRefresh();
      setRefreshSuccess(true);
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
        setRefreshSuccess(false);
      }, 500);
    } catch (error) {
      setRefreshError(true);
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
        setRefreshError(false);
      }, 1500);
    }
  }, [onRefresh, threshold]);

  // Setup touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart as any, { passive: true });
    container.addEventListener("touchmove", handleTouchMove as any, { passive: true });
    container.addEventListener("touchend", handleTouchEnd as any, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart as any);
      container.removeEventListener("touchmove", handleTouchMove as any);
      container.removeEventListener("touchend", handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      setPullDistance(0);
      setRefreshing(false);
      setRefreshSuccess(false);
      setRefreshError(false);
    };
  }, []);

  // Calculate progress (0 to 1)
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={`touch-gesture-container ${className}`}
      data-scroll-container="true"
    >
      {/* Pull indicator */}
      <div
        className="pull-indicator"
        style={{
          transform: `translateY(${Math.min(pullDistance, pullMax) - 60}px)`,
          opacity: pullDistance > 0 ? Math.min(progress * 1.5, 1) : 0,
        }}
      >
        {!refreshing && (
          <>
            {pullDistance >= threshold ? (
              <RefreshCw className="pull-icon pull-icon-spin" />
            ) : (
              <>
                <div className="pull-arrow" />
                <div className="pull-arrow" />
                <div className="pull-arrow" />
              </>
            )}
            <span className="pull-text">
              {pullDistance >= threshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          </>
        )}

        {/* Loading indicator */}
        {refreshing && (
          <>
            {refreshSuccess ? (
              <Check className="refresh-icon refresh-icon-success" />
            ) : refreshError ? (
              <AlertCircle className="refresh-icon refresh-icon-error" />
            ) : (
              <RefreshCw className="refresh-icon refresh-icon-loading spin" />
            )}
            <span className="refresh-text">
              {refreshSuccess ? "Updated" : "Updating..."}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
