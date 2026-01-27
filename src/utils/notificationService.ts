/**
 * Notification Service
 * Handles notifications for both PWA (Web Notifications API) and Tauri (native notifications)
 */

import { isTauri, invokeCommand } from "../lib/tauri";

export type NotificationPermission = "granted" | "denied" | "default";

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ScheduledNotification {
  id: string;
  options: NotificationOptions;
  timestamp: number;
  repeat?: "daily" | "weekly" | "none";
}

// In-memory store for scheduled notifications (until service worker handles them)
let scheduledNotifications: ScheduledNotification[] = [];

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported(): boolean {
  if (isTauri()) {
    return true; // Tauri supports notifications via plugin
  }
  return "Notification" in window;
}

/**
 * Check current notification permission status
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (isTauri()) {
    try {
      // Use Tauri command to check permission
      const result = await invokeCommand<{ granted: boolean }>(
        "check_notification_permission"
      );
      return result.granted ? "granted" : "default";
    } catch {
      return "default";
    }
  }

  if (!("Notification" in window)) {
    return "denied";
  }

  return window.Notification.permission as NotificationPermission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isTauri()) {
    try {
      // Use Tauri command to request permission
      const result = await invokeCommand<{ granted: boolean }>(
        "request_notification_permission"
      );
      return result.granted ? "granted" : "denied";
    } catch (error) {
      console.error("Failed to request Tauri notification permission:", error);
      return "denied";
    }
  }

  if (!("Notification" in window)) {
    return "denied";
  }

  try {
    const permission = await window.Notification.requestPermission();
    return permission as NotificationPermission;
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return "denied";
  }
}

/**
 * Send a notification immediately
 */
export async function sendNotification(
  options: NotificationOptions
): Promise<boolean> {
  const permission = await checkNotificationPermission();
  if (permission !== "granted") {
    console.warn("Notification permission not granted");
    return false;
  }

  // Check quiet hours
  if (isInQuietHours()) {
    console.log("Notification blocked by quiet hours");
    return false;
  }

  if (isTauri()) {
    return sendTauriNotification(options);
  } else {
    return sendWebNotification(options);
  }
}

/**
 * Send notification via Tauri
 */
async function sendTauriNotification(
  options: NotificationOptions
): Promise<boolean> {
  try {
    // Use Tauri command to send notification
    await invokeCommand("send_notification", {
      notification: {
        id: generateId(),
        notification_type: "Custom",
        title: options.title,
        body: options.body || "",
        priority: "Normal",
        icon: options.icon,
        image: null,
        action: options.data?.url ? `incrementum://${options.data.url}` : null,
        created_at: new Date().toISOString(),
        read: false,
        ttl: 3600,
      },
    });

    // Play sound if enabled
    if (!options.silent) {
      playNotificationSound();
    }

    return true;
  } catch (error) {
    console.error("Failed to send Tauri notification:", error);
    return false;
  }
}

/**
 * Send notification via Web Notifications API
 */
async function sendWebNotification(
  options: NotificationOptions
): Promise<boolean> {
  try {
    // Check if service worker is available for better notification handling
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      // Use service worker to show notification
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        payload: options,
      });
      return true;
    }

    // Fallback to standard Notification API
    const notification = new window.Notification(options.title, {
      body: options.body,
      icon: options.icon,
      badge: options.badge,
      tag: options.tag,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
      data: options.data,
    });

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Play sound if enabled
    if (!options.silent) {
      playNotificationSound();
    }

    return true;
  } catch (error) {
    console.error("Failed to send web notification:", error);
    return false;
  }
}

/**
 * Schedule a notification for later
 */
export async function scheduleNotification(
  options: NotificationOptions,
  delayMs: number = 0
): Promise<boolean> {
  const permission = await checkNotificationPermission();
  if (permission !== "granted") {
    return false;
  }

  if (delayMs <= 0) {
    // Send immediately
    return sendNotification(options);
  }

  // Store for later
  const scheduled: ScheduledNotification = {
    id: generateId(),
    options,
    timestamp: Date.now() + delayMs,
  };

  scheduledNotifications.push(scheduled);

  // Set timeout to trigger
  setTimeout(() => {
    sendNotification(options);
    // Remove from scheduled list
    scheduledNotifications = scheduledNotifications.filter(
      (n) => n.id !== scheduled.id
    );
  }, delayMs);

  return true;
}

/**
 * Schedule a daily recurring notification
 */
export function scheduleDailyNotification(
  options: NotificationOptions,
  hour: number,
  minute: number = 0
): string {
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hour, minute, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delayMs = scheduledTime.getTime() - now.getTime();

  const scheduled: ScheduledNotification = {
    id: generateId(),
    options,
    timestamp: scheduledTime.getTime(),
    repeat: "daily",
  };

  scheduledNotifications.push(scheduled);

  // Schedule first occurrence
  setTimeout(() => {
    sendNotification(options);
    // Reschedule for next day
    scheduleDailyNotification(options, hour, minute);
  }, delayMs);

  return scheduled.id;
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(id: string): boolean {
  const initialLength = scheduledNotifications.length;
  scheduledNotifications = scheduledNotifications.filter((n) => n.id !== id);
  return scheduledNotifications.length < initialLength;
}

/**
 * Cancel all scheduled notifications
 */
export function cancelAllNotifications(): void {
  scheduledNotifications = [];
}

/**
 * Get all scheduled notifications
 */
export function getScheduledNotifications(): ScheduledNotification[] {
  return [...scheduledNotifications];
}

/**
 * Check if currently in quiet hours
 */
function isInQuietHours(): boolean {
  // Get quiet hours from settings (stored in localStorage for simplicity)
  const settings = localStorage.getItem("incrementum-settings");
  if (!settings) return false;

  try {
    const parsed = JSON.parse(settings);
    const { notifications } = parsed.state?.settings || {};

    if (!notifications?.quietHoursEnabled) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = (notifications.quietHoursStart || "22:00")
      .split(":")
      .map(Number);
    const [endHour, endMinute] = (notifications.quietHoursEnd || "08:00")
      .split(":")
      .map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime < endTime) {
      // Same day (e.g., 9 AM to 5 PM)
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight (e.g., 10 PM to 8 AM)
      return currentTime >= startTime || currentTime < endTime;
    }
  } catch {
    return false;
  }
}

/**
 * Play notification sound
 */
function playNotificationSound(): void {
  // Get sound setting from localStorage
  const settings = localStorage.getItem("incrementum-settings");
  if (!settings) return;

  try {
    const parsed = JSON.parse(settings);
    const { notifications } = parsed.state?.settings || {};

    if (!notifications?.soundEnabled) return;

    // Use Web Audio API for a simple notification sound
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(
      440,
      audioContext.currentTime + 0.1
    );

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

/**
 * Update app badge count (for PWA)
 */
export async function updateBadgeCount(count: number): Promise<void> {
  if (isTauri()) {
    // Tauri doesn't support badge count directly, but we could use the tray icon
    return;
  }

  // Use Badging API for PWA
  if ("setAppBadge" in navigator) {
    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (error) {
      console.error("Failed to update badge:", error);
    }
  }
}

/**
 * Clear app badge
 */
export async function clearBadge(): Promise<void> {
  if ("clearAppBadge" in navigator) {
    try {
      await (navigator as any).clearAppBadge();
    } catch (error) {
      console.error("Failed to clear badge:", error);
    }
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize notification service
 * Sets up listeners and restores scheduled notifications
 */
export function initializeNotifications(): void {
  // Listen for messages from service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "NOTIFICATION_CLICKED") {
        // Handle notification click
        window.focus();
        // Could dispatch a custom event here
        window.dispatchEvent(
          new CustomEvent("notification-clicked", {
            detail: event.data.payload,
          })
        );
      }
    });
  }

  // Schedule daily study reminder if enabled
  scheduleStudyReminder();
}

/**
 * Schedule study reminder based on settings
 */
function scheduleStudyReminder(): void {
  const settings = localStorage.getItem("incrementum-settings");
  if (!settings) return;

  try {
    const parsed = JSON.parse(settings);
    const { notifications } = parsed.state?.settings || {};

    if (
      !notifications?.enabled ||
      !notifications?.studyReminders
    ) {
      return;
    }

    const [hour, minute] = (notifications.reminderTime || "09:00")
      .split(":")
      .map(Number);

    scheduleDailyNotification(
      {
        title: "Time to Study! 📚",
        body: "Your daily review is ready. Keep your streak going!",
        icon: "/icon.png",
        tag: "study-reminder",
      },
      hour,
      minute
    );

    console.log(`[Notifications] Study reminder scheduled for ${hour}:${minute}`);
  } catch (error) {
    console.error("Failed to schedule study reminder:", error);
  }
}

/**
 * Check if notifications are enabled and permitted
 */
export async function areNotificationsActive(): Promise<boolean> {
  const permission = await checkNotificationPermission();
  if (permission !== "granted") return false;

  const settings = localStorage.getItem("incrementum-settings");
  if (!settings) return false;

  try {
    const parsed = JSON.parse(settings);
    return parsed.state?.settings?.notifications?.enabled ?? false;
  } catch {
    return false;
  }
}

/**
 * Send study completion notification
 */
export async function sendStudyCompletionNotification(
  cardsReviewed: number
): Promise<void> {
  const isActive = await areNotificationsActive();
  if (!isActive) return;

  await sendNotification({
    title: "Study Session Complete! 🎉",
    body: `You reviewed ${cardsReviewed} cards. Great job keeping up with your schedule!`,
    icon: "/icon.png",
    tag: "study-complete",
  });
}

/**
 * Send due cards notification
 */
export async function sendDueCardsNotification(count: number): Promise<void> {
  const isActive = await areNotificationsActive();
  if (!isActive) return;

  // Check if due date reminders are enabled
  const settings = localStorage.getItem("incrementum-settings");
  if (!settings) return;

  try {
    const parsed = JSON.parse(settings);
    if (!parsed.state?.settings?.notifications?.dueDateReminders) {
      return;
    }
  } catch {
    return;
  }

  await sendNotification({
    title: "Cards Due for Review 📖",
    body: `You have ${count} card${count !== 1 ? "s" : ""} ready for review.`,
    icon: "/icon.png",
    tag: "due-cards",
  });
}
