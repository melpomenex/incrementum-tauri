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
import { NavLink, useLocation } from "react-router-dom";
import {
  Download,
  X,
  Home,
  FileText,
  Brain,
  Rss,
  Settings,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { getDeviceInfo, isPWA, isOnline, listenNetworkChanges } from "../../lib/pwa";

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
    // Only show in PWA mode (not Tauri)
    if (!isPWA()) return;

    // Check if already installed
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches;

    if (isInstalled) return;

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event received');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
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

/**
 * Mobile Bottom Navigation
 *
 * Provides mobile-optimized bottom navigation with:
 * - Tab-based navigation
 * - Active state indicators
 * - Badge notifications
 * - Responsive icon sizing
 */

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Home",
    icon: Home,
    path: "/#/",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    path: "/#/documents",
  },
  {
    id: "review",
    label: "Review",
    icon: Brain,
    path: "/#/review",
  },
  {
    id: "rss",
    label: "RSS",
    icon: Rss,
    path: "/#/rss",
  },
  {
    id: "analytics",
    label: "Stats",
    icon: BarChart3,
    path: "/#/analytics",
  },
];

interface MobileNavigationProps {
  dueCount?: number;
  unreadCount?: number;
}

export function MobileNavigation({ dueCount = 0, unreadCount = 0 }: MobileNavigationProps) {
  const location = useLocation();

  // Check if current path matches (handles hash routing)
  const isActive = (path: string) => {
    const currentPath = location.pathname + location.hash;
    return currentPath === path || currentPath.replace(/\/$/, '') === path;
  };

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.path);
        const badge = item.id === "review" ? dueCount :
                     item.id === "rss" ? unreadCount :
                     item.badge;

        return (
          <NavLink
            key={item.id}
            to={item.path}
            className={`mobile-nav-item ${active ? 'active' : ''}`}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <div className="mobile-nav-icon">
              <item.icon className="w-6 h-6" />
              {badge > 0 && (
                <span className="mobile-nav-badge">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/**
 * Mobile Settings Panel with PWA-specific options
 */

interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface SelectSettingProps {
  label: string;
  value: string;
  options: { value: string; label: string; }[];
  onChange: (value: string) => void;
}

interface ButtonSettingProps {
  label: string;
  description?: string;
  onClick: () => void;
}

export interface MobileSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSettingsPanel({
  isOpen,
  onClose,
}: MobileSettingsPanelProps) {
  const [settings, setSettings] = useState({
    autoSync: true,
    offlineMode: true,
    notifications: true,
    vibration: true,
    fontSize: "medium",
  });

  if (!isOpen) return null;

  return (
    <div className="mobile-settings-panel" onClick={onClose}>
      <div className="mobile-settings-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mobile-settings-header">
          <h2 className="mobile-settings-title">Settings</h2>
          <button
            onClick={onClose}
            className="mobile-settings-close"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PWA Status */}
        <div className="mobile-settings-section">
          <h3 className="mobile-settings-section-title">App Status</h3>
          <PWastatusIndicator />
        </div>

        {/* Sync & Offline Settings */}
        <div className="mobile-settings-section">
          <h3 className="mobile-settings-section-title">Sync & Offline</h3>
          <ToggleSetting
            label="Auto-sync content"
            checked={settings.autoSync}
            onChange={(checked) => setSettings({ ...settings, autoSync: checked })}
          />
          <ToggleSetting
            label="Offline reading mode"
            description="Download content for offline access"
            checked={settings.offlineMode}
            onChange={(checked) => setSettings({ ...settings, offlineMode: checked })}
          />
        </div>

        {/* Reading Settings */}
        <div className="mobile-settings-section">
          <h3 className="mobile-settings-section-title">Reading</h3>
          <SelectSetting
            label="Font size"
            value={settings.fontSize}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            onChange={(value) => setSettings({ ...settings, fontSize: value })}
          />
        </div>

        {/* Interface Settings */}
        <div className="mobile-settings-section">
          <h3 className="mobile-settings-section-title">Interface</h3>
          <ToggleSetting
            label="Notifications"
            description="Learning reminders and updates"
            checked={settings.notifications}
            onChange={(checked) => setSettings({ ...settings, notifications: checked })}
          />
          <ToggleSetting
            label="Vibration feedback"
            checked={settings.vibration}
            onChange={(checked) => setSettings({ ...settings, vibration: checked })}
          />
        </div>

        {/* Save button */}
        <div className="mobile-settings-footer">
          <button
            onClick={() => {
              console.log("Saving settings:", settings);
              onClose();
            }}
            className="mobile-settings-save"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PWA Status indicator
 */
function PWastatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check PWA status
    const checkPWA = () => {
      setIsPWA(
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      );
    };

    checkPWA();
    window.matchMedia("(display-mode: standalone)").addEventListener("change", checkPWA);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="pwa-status">
      <div className={`pwa-status-item ${isPWA ? "installed" : ""}`}>
        <span className="pwa-status-dot" />
        <span className="text-xs text-muted-foreground">
          {isPWA ? "Installed as app" : "Install as app"}
        </span>
      </div>
      <div className={`pwa-status-item ${isOnline ? "online" : "offline"}`}>
        <span className="pwa-status-dot" />
        <span className="text-xs text-muted-foreground">
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}

/**
 * Toggle setting component
 */
interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: ToggleSettingProps) {
  return (
    <div className="toggle-setting">
      <div className="toggle-setting-info">
        <span className="toggle-setting-label">{label}</span>
        {description && (
          <span className="toggle-setting-desc">{description}</span>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`toggle-switch ${checked ? "on" : "off"}`}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
      >
        <span className="toggle-slider" />
      </button>
    </div>
  );
}

/**
 * Select setting component
 */
interface SelectSettingProps {
  label: string;
  value: string;
  options: { value: string; label: string; }[];
  onChange: (value: string) => void;
}

function SelectSetting({
  label,
  value,
  options,
  onChange,
}: SelectSettingProps) {
  return (
    <div className="select-setting">
      <label className="select-setting-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-setting-select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Button setting component
 */
interface ButtonSettingProps {
  label: string;
  description?: string;
  onClick: () => void;
}

function ButtonSetting({
  label,
  description,
  onClick,
}: ButtonSettingProps) {
  return (
    <button
      onClick={onClick}
      className="button-setting"
    >
      <div className="button-setting-info">
        <span className="button-setting-label">{label}</span>
        {description && (
          <span className="button-setting-desc">{description}</span>
        )}
      </div>
    </button>
  );
}