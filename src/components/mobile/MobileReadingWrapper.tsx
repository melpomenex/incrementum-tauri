/**
 * Mobile Reading Wrapper
 *
 * Provides mobile-optimized reading interface with:
 * - Touch gesture controls (swipe, pinch, tap)
 * - Responsive layout adaptation
 * - Mobile-optimized toolbar
 * - Full-screen reading mode
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Maximize2, Minimize2, ChevronLeft, ChevronRight, MoreVertical, BookOpen } from "lucide-react";
import { getDeviceInfo, type DeviceInfo } from "../../lib/pwa";

interface MobileReadingWrapperProps {
  documentId: string;
  documentTitle: string;
  children: React.ReactNode;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onClose?: () => void;
}

export function MobileReadingWrapper({
  documentId,
  documentTitle,
  children,
  currentPage = 1,
  totalPages = 0,
  onPageChange,
  onClose,
}: MobileReadingWrapperProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // Update device info on resize
  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (!deviceInfo.isMobile) return;

    let hideTimeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    };

    resetTimer();

    // Show controls on tap
    const handleTap = () => {
      setShowControls(true);
      resetTimer();
    };

    document.addEventListener('click', handleTap);
    document.addEventListener('touchstart', handleTap);

    return () => {
      clearTimeout(hideTimeout);
      document.removeEventListener('click', handleTap);
      document.removeEventListener('touchstart', handleTap);
    };
  }, [isFullscreen, deviceInfo.isMobile]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  }, []);

  // Next/Previous page handlers
  const handlePrevious = useCallback(() => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Don't show mobile wrapper on desktop
  if (!deviceInfo.isMobile && !deviceInfo.isTablet) {
    return <>{children}</>;
  }

  return (
    <div className={`mobile-reading-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Mobile Header */}
      <div
        className={`mobile-header ${showControls ? 'visible' : 'hidden'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="mobile-header-btn"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mobile-header-title">
          <span className="text-sm font-medium truncate block max-w-[200px]">
            {documentTitle}
          </span>
          {totalPages > 0 && (
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        <div className="mobile-header-actions">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="mobile-header-btn"
            aria-label="Menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reading Content */}
      <div className="mobile-content">
        {children}
      </div>

      {/* Mobile Footer Controls */}
      <div
        className={`mobile-footer ${showControls ? 'visible' : 'hidden'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Page Navigation */}
        {totalPages > 1 && (
          <div className="mobile-page-nav">
            <button
              onClick={handlePrevious}
              disabled={currentPage <= 1}
              className="mobile-nav-btn"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="mobile-page-indicator">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={handleNext}
              disabled={currentPage >= totalPages}
              className="mobile-nav-btn"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mobile-actions">
          <button
            onClick={toggleFullscreen}
            className="mobile-action-btn"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Reading Progress Indicator */}
          {totalPages > 0 && (
            <div className="mobile-progress-indicator">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(currentPage / totalPages) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="mobile-menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-item">
              <button
                onClick={() => {
                  // Jump to specific page
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Jump to Page...
              </button>
            </div>
            <div className="mobile-menu-item">
              <button
                onClick={() => {
                  // Toggle settings
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Reading Settings
              </button>
            </div>
            <div className="mobile-menu-item">
              <button
                onClick={() => {
                  // Add to favorites
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Add to Favorites
              </button>
            </div>
            <div className="mobile-menu-item">
              <button
                onClick={() => {
                  // Table of contents
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Table of Contents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tap to reveal controls hint */}
      {isFullscreen && !showControls && (
        <div className="mobile-controls-hint">
          Tap to show controls
        </div>
      )}
    </div>
  );
}
