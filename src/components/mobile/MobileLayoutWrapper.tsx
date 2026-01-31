/**
 * Mobile Layout Wrapper
 *
 * Wraps the application with mobile-specific components:
 * - PWA install prompt
 * - Offline indicator
 * - Mobile bottom navigation
 */

import { useEffect, useState } from "react";
import { PWAInstallPrompt, OfflineIndicator } from "./PWAComponents";
import { MobileNavigation } from "./MobileNavigation";
import { getDeviceInfo } from "../../lib/pwa";
import { useQueueStore } from "../../stores";
import { isTauri } from "../../lib/tauri";

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
}

export function MobileLayoutWrapper({ children }: MobileLayoutWrapperProps) {
  const { items: queueItems } = useQueueStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if device is mobile
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;

  // Calculate badge counts
  const dueCount = queueItems.filter(item => {
    if (item.itemType === "document") {
      const doc = item.dueDate ? new Date(item.dueDate) : null;
      return doc && doc <= new Date();
    }
    return false;
  }).length;

  const unreadCount = 0; // TODO: Implement RSS unread count

  useEffect(() => {
    const updateFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    updateFullscreen();
    document.addEventListener("fullscreenchange", updateFullscreen);
    document.addEventListener("webkitfullscreenchange", updateFullscreen as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.removeEventListener("webkitfullscreenchange", updateFullscreen as EventListener);
    };
  }, []);

  // Only show mobile navigation on mobile devices
  if (!isMobile || isTauri()) {
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
      <MobileNavigation
        dueCount={dueCount}
        unreadCount={unreadCount}
        hidden={isFullscreen}
      />
    </>
  );
}
