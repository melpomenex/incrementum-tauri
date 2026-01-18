/**
 * Mobile PWA Components
 *
 * PWA-specific components including:
 * - Install prompt
 * - Offline indicator
 * - Mobile navigation
 * - Settings panel
 */

import { useState, useEffect } from "react";
import {
  Download,
  X,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { isOnline, listenNetworkChanges } from "../../lib/pwa";
import { isTauri } from "../../lib/tauri";

/**
 * PWA Install Prompt Component
 *
 * Shows an install prompt when the app meets installability criteria
 * and the user hasn't installed it yet.
 */
export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isTauri()) return;

    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isInstalled) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event received');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log('[PWA] Install prompt outcome:', outcome);

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <button
        onClick={handleInstall}
        className="pwa-install-btn"
      >
        <Download className="w-5 h-5 mr-2" />
        Install App
      </button>
      <button
        onClick={handleDismiss}
        className="pwa-dismiss-btn"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Offline Indicator Component
 *
 * Shows an offline banner when connection is lost
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const unsubscribe = listenNetworkChanges(setOnline);
    return unsubscribe;
  }, []);

  if (online) return null;

  return (
    <div className="offline-indicator">
      <WifiOff className="w-4 h-4 mr-2" />
      <span className="offline-text">You're offline. Some features may be unavailable.</span>
      <button
        onClick={() => window.location.reload()}
        className="offline-retry-btn"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </button>
    </div>
  );
}
