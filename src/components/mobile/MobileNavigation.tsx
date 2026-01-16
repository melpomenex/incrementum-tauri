/**
 * Mobile Bottom Navigation
 *
 * Provides mobile-optimized bottom navigation with:
 * - Tab-based navigation
 * - Active state indicators
 * - Badge notifications
 * - Responsive icon sizing
 */

import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  FileText,
  Brain,
  Rss,
  Settings,
  BarChart3,
} from "lucide-react";

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
    // Remove trailing slash and compare
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
 * Mobile settings panel with PWA-specific options
 */
export function MobileSettingsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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

        {/* Sync Settings */}
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

        {/* Cache Management */}
        <div className="mobile-settings-section">
          <h3 className="mobile-settings-section-title">Storage</h3>
          <ButtonSetting
            label="Clear offline data"
            description="Free up storage used by offline content"
            onClick={() => {
              // Implement clear cache
              console.log("Clearing offline data");
            }}
          />
          <ButtonSetting
            label="Download for offline"
            description="Download current document for offline reading"
            onClick={() => {
              // Implement offline download
              console.log("Downloading for offline");
            }}
          />
        </div>

        {/* Save button */}
        <div className="mobile-settings-footer">
          <button
            onClick={() => {
              // Save settings
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
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
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
function SelectSetting({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
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
function ButtonSetting({
  label,
  description,
  onClick,
}: {
  label: string;
  description?: string;
  onClick: () => void;
}) {
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
