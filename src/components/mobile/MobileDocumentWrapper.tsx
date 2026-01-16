/**
 * Mobile Document Wrapper with Pull-to-Refresh
 *
 * Wraps document viewers (PDF, EPUB, YouTube, Markdown) with:
 * - Pull-to-refresh functionality
 * - Touch gesture support
 * - Mobile-specific optimizations
 */

import { useState, useCallback } from "react";
import { PullToRefresh } from "./PullToRefresh";
import { getDeviceInfo } from "../../lib/pwa";

interface MobileDocumentWrapperProps {
  documentId: string;
  documentTitle: string;
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export function MobileDocumentWrapper({
  documentId,
  documentTitle,
  children,
  onRefresh,
}: MobileDocumentWrapperProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if device is mobile
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;

  // Default refresh handler - reloads the document data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      // Call the provided refresh handler
      if (onRefresh) {
        await onRefresh();
      } else {
        // Default behavior: reload the page data
        console.log('[Mobile] Refreshing document:', documentId);
        // In a real implementation, this would trigger a data reload
        // For now, we just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('[Mobile] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [documentId, onRefresh]);

  // If not mobile, just return children without wrapper
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      disabled={isRefreshing}
      className="mobile-document-wrapper"
    >
      {children}
    </PullToRefresh>
  );
}

/**
 * Hook to use mobile document wrapper functionality
 */
export function useMobileDocumentRefresh(documentId: string) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Trigger document reload via invalidation
      // This would integrate with your data fetching layer
      console.log('[Mobile] Refreshing document:', documentId);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsRefreshing(false);
    }
  }, [documentId]);

  return { isRefreshing, refresh };
}
