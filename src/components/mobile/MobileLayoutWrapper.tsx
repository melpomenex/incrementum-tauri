/**
 * Mobile Layout Wrapper
 *
 * Wraps the application with mobile-specific components:
 * - PWA install prompt
 * - Offline indicator
 * - Mobile bottom navigation
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PWAInstallPrompt, OfflineIndicator } from "./PWAComponents";
import { MobileNavigation } from "./MobileNavigation";
import { getDeviceInfo } from "../../lib/pwa";
import { useQueueStore } from "../../stores";

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
}

export function MobileLayoutWrapper({ children }: MobileLayoutWrapperProps) {
  const location = useLocation();
  const { items: queueItems } = useQueueStore();

  // Check if device is mobile
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;

  // Calculate badge counts
  const dueCount = queueItems.filter(item => {
    if (item.itemType === "document") {
      const doc = item.dueAt ? new Date(item.dueAt) : null;
      return doc && doc <= new Date();
    }
    return false;
  }).length;

  const unreadCount = 0; // TODO: Implement RSS unread count

  // Only show mobile navigation on mobile devices
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <>
      {/* PWA Components */}
      <PWAInstallPrompt />
      <OfflineIndicator />

      {/* Main Content */}
      <div className="mobile-main-content">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation dueCount={dueCount} unreadCount={unreadCount} />
    </>
  );
}
