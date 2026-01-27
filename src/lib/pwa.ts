/**
 * Progressive Web App (PWA) utilities
 *
 * Provides service worker registration, offline detection,
 * and PWA-specific functionality.
 */

/**
 * Check if running in PWA mode (installed as app)
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      type: 'classic'
    });

    console.log('[PWA] Service worker registered:', registration.scope);

    // Listen for updates
    registration.addEventListener('update', () => {
      console.log('[PWA] New service worker available');
    });

    return true;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return false;
  }
}

/**
 * Get current service worker version
 */
export async function getServiceWorkerVersion(): Promise<string | null> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return null;
  }

  try {
    // Send message to service worker to get version
    const messageChannel = new MessageChannel();
    const versionPromise = new Promise<string>((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version);
      };
    });

    navigator.serviceWorker.controller.postMessage({
      action: 'get-version'
    }, [messageChannel.port2]);

    return await versionPromise;
  } catch {
    return null;
  }
}

/**
 * Trigger service worker update
 */
export async function updateServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.update();
    console.log('[PWA] Service worker updated');
  }
}

/**
 * Cache specific documents for offline reading
 */
export async function cacheDocumentsForOffline(documentIds: string[]): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn('[PWA] Service worker not active');
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    action: 'cache-documents',
    data: { documentIds }
  });
}

/**
 * Clear all PWA caches
 */
export async function clearPWACache(): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn('[PWA] Service worker not active');
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    action: 'clear-cache'
  });
}

/**
 * Request PWA installation prompt (works in some browsers)
 */
export function promptInstall(): void {
  // Some browsers support deferred prompts
  // This would be called after user interaction
  console.log('[PWA] Install prompt requested');
}

/**
 * Listen for online/offline events
 */
export function listenNetworkChanges(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Add to home screen prompt helper
 */
export function showAddToHomeScreenPrompt(): void {
  // Detect iOS Safari standalone mode
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
               !(window as any).MSStream;

  if (isIOS && !isPWA()) {
    // Show iOS specific instructions
    console.log('[PWA] iOS add to home screen prompt needed');
  }
}

/**
 * Get device information for PWA optimization
 */
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  isOnline: boolean;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
}

export function getDeviceInfo(): DeviceInfo {
  const width = window.screen.width;
  const height = window.screen.height;
  const pixelRatio = window.devicePixelRatio || 1;

  // Mobile detection
  const isMobile = width < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Tablet detection
  const isTablet = !isMobile && width < 1024;

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isPWA: isPWA(),
    isOnline: isOnline(),
    pixelRatio,
    screenWidth: width,
    screenHeight: height
  };
}

/**
 * Register PWA on app mount
 */
export function initializePWA(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (import.meta.env.DEV) {
    return;
  }

  const shouldEnablePWA = !isTauri() && (import.meta.env.MODE === 'pwa' || import.meta.env.PROD);
  if (!shouldEnablePWA) {
    return;
  }

  registerServiceWorker().then((registered) => {
    if (registered) {
      console.log('[PWA] PWA initialized successfully');
    }
  });

  // Log initial online status
  console.log('[PWA] Initial online status:', isOnline() ? 'online' : 'offline');
}

/**
 * Hook for using PWA status in components
 */
export function usePWAStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pwa, setPwa] = useState(isPWA());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    online,
    pwa,
    device: getDeviceInfo()
  };
}

// Import useState and useEffect for the hook
import { useState, useEffect } from 'react';
import { isTauri } from './tauri';
