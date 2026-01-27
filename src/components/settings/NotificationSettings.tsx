/**
 * Notification Settings Component
 * Configures notification preferences for both PWA and Tauri
 */

import { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  Clock,
  Calendar,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { isTauri, isPWA } from "../../lib/tauri";
import {
  requestNotificationPermission,
  checkNotificationPermission,
  scheduleNotification,
  cancelAllNotifications,
  type NotificationPermission,
} from "../../utils/notificationService";

interface NotificationSettingsProps {
  onChange?: () => void;
}

/**
 * Notification Settings Component
 */
export function NotificationSettings({ onChange }: NotificationSettingsProps) {
  const { settings, updateSettingsCategory } = useSettingsStore();
  const notificationSettings = settings.notifications;

  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isRequesting, setIsRequesting] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [platform, setPlatform] = useState<"tauri" | "pwa" | "web">("web");

  // Detect platform on mount
  useEffect(() => {
    if (isTauri()) {
      setPlatform("tauri");
    } else if (isPWA()) {
      setPlatform("pwa");
    } else {
      setPlatform("web");
    }
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    checkNotificationPermission().then(setPermission);
  }, []);

  // Handle settings update
  const handleUpdate = (updates: Partial<typeof notificationSettings>) => {
    updateSettingsCategory("notifications", updates);
    onChange?.();
  };

  // Request notification permission
  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      // Auto-enable notifications if granted
      if (newPermission === "granted" && !notificationSettings.enabled) {
        handleUpdate({ enabled: true });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  // Send test notification
  const handleTestNotification = async () => {
    const result = await scheduleNotification({
      title: "Test Notification",
      body: "This is a test notification from Incrementum!",
      icon: "/icon.png",
      tag: "test",
    });

    if (result) {
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    }
  };

  // Get permission status display
  const getPermissionStatus = () => {
    switch (permission) {
      case "granted":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bg: "bg-green-500/10",
          text: "Permission granted",
        };
      case "denied":
        return {
          icon: XCircle,
          color: "text-red-500",
          bg: "bg-red-500/10",
          text: "Permission denied",
        };
      default:
        return {
          icon: AlertCircle,
          color: "text-yellow-500",
          bg: "bg-yellow-500/10",
          text: "Permission not requested",
        };
    }
  };

  const permissionStatus = getPermissionStatus();
  const PermissionIcon = permissionStatus.icon;

  return (
    <div className="space-y-8">
      {/* Platform Info */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        {platform === "tauri" ? (
          <Monitor className="w-5 h-5 text-primary" />
        ) : platform === "pwa" ? (
          <Smartphone className="w-5 h-5 text-primary" />
        ) : (
          <Info className="w-5 h-5 text-primary" />
        )}
        <div>
          <p className="text-sm font-medium">
            Platform: {platform === "tauri" ? "Desktop App" : platform === "pwa" ? "Installed PWA" : "Web Browser"}
          </p>
          <p className="text-xs text-muted-foreground">
            {platform === "tauri"
              ? "Using native desktop notifications"
              : platform === "pwa"
              ? "Using PWA push notifications"
              : "Install as PWA for better notification support"}
          </p>
        </div>
      </div>

      {/* Permission Status */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Notification Permission</h3>
        <div className="space-y-4">
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${permissionStatus.bg}`}
          >
            <PermissionIcon className={`w-5 h-5 ${permissionStatus.color}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${permissionStatus.color}`}>
                {permissionStatus.text}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === "granted"
                  ? "You will receive notifications based on your preferences"
                  : permission === "denied"
                  ? "Please enable notifications in your browser or system settings"
                  : "Click the button below to enable notifications"}
              </p>
            </div>
            {permission !== "granted" && (
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting || permission === "denied"}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isRequesting ? "Requesting..." : "Enable Notifications"}
              </button>
            )}
          </div>

          {permission === "denied" && (
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>How to enable:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                {platform === "tauri" ? (
                  <>
                    <li>Open System Preferences → Notifications</li>
                    <li>Find Incrementum in the list</li>
                    <li>Enable "Allow Notifications"</li>
                  </>
                ) : (
                  <>
                    <li>Click the lock icon in the address bar</li>
                    <li>Find "Notifications" in site settings</li>
                    <li>Change to "Allow"</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Main Toggle */}
      <section>
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Enable Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications for study reminders and due dates
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={notificationSettings.enabled}
              onChange={(e) => handleUpdate({ enabled: e.target.checked })}
              disabled={permission !== "granted"}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
          </label>
        </div>
      </section>

      {/* Notification Types */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
        <div className="space-y-4">
          {/* Study Reminders */}
          <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Study Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Daily reminders to start your review session
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.studyReminders}
                onChange={(e) =>
                  handleUpdate({ studyReminders: e.target.checked })
                }
                disabled={!notificationSettings.enabled}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
            </label>
          </div>

          {/* Reminder Time */}
          {notificationSettings.studyReminders && (
            <div className="ml-8 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Reminder time</span>
                </div>
                <input
                  type="time"
                  value={notificationSettings.reminderTime}
                  onChange={(e) =>
                    handleUpdate({ reminderTime: e.target.value })
                  }
                  disabled={!notificationSettings.enabled}
                  className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Due Date Reminders */}
          <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Due Date Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Notify when cards are due for review
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.dueDateReminders}
                onChange={(e) =>
                  handleUpdate({ dueDateReminders: e.target.checked })
                }
                disabled={!notificationSettings.enabled}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
            </label>
          </div>

          {/* Sound Effects */}
          <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              {notificationSettings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground mt-0.5" />
              )}
              <div>
                <p className="font-medium">Notification Sounds</p>
                <p className="text-sm text-muted-foreground">
                  Play sound with notifications
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.soundEnabled}
                onChange={(e) =>
                  handleUpdate({ soundEnabled: e.target.checked })
                }
                disabled={!notificationSettings.enabled}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Additional Options */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Additional Options</h3>
        <div className="space-y-4">
          {/* Quiet Hours */}
          <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Quiet Hours</p>
                <p className="text-sm text-muted-foreground">
                  Pause notifications during specific hours
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.quietHoursEnabled}
                onChange={(e) =>
                  handleUpdate({ quietHoursEnabled: e.target.checked })
                }
                disabled={!notificationSettings.enabled}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
            </label>
          </div>

          {notificationSettings.quietHoursEnabled && (
            <div className="ml-8 p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Start</span>
                <input
                  type="time"
                  value={notificationSettings.quietHoursStart || "22:00"}
                  onChange={(e) =>
                    handleUpdate({ quietHoursStart: e.target.value })
                  }
                  disabled={!notificationSettings.enabled}
                  className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">End</span>
                <input
                  type="time"
                  value={notificationSettings.quietHoursEnd || "08:00"}
                  onChange={(e) =>
                    handleUpdate({ quietHoursEnd: e.target.value })
                  }
                  disabled={!notificationSettings.enabled}
                  className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Badge Count */}
          <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Show Badge Count</p>
                <p className="text-sm text-muted-foreground">
                  Display due card count on app icon/badge
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.showBadge}
                onChange={(e) => handleUpdate({ showBadge: e.target.checked })}
                disabled={!notificationSettings.enabled}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Test Notification */}
      {permission === "granted" && notificationSettings.enabled && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Test</h3>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Send Test Notification</p>
              <p className="text-sm text-muted-foreground">
                Verify your notification settings are working
              </p>
            </div>
            <button
              onClick={handleTestNotification}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                testNotificationSent
                  ? "bg-green-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {testNotificationSent ? "Sent!" : "Send Test"}
            </button>
          </div>
        </section>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-600 dark:text-blue-400">
            <p className="font-medium mb-1">About Notifications</p>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              <li>Study reminders are sent daily at your chosen time</li>
              <li>Due date reminders notify you when cards are ready for review</li>
              <li>Quiet hours prevent notifications during sleep hours</li>
              {platform === "pwa" && (
                <li>PWA notifications work even when the app is closed</li>
              )}
              {platform === "tauri" && (
                <li>Desktop notifications use your system's notification center</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
