/**
 * Browser Extension Bridge for PWA Mode
 *
 * Enables communication between the Incrementum browser extension and the web app
 * when running in PWA/browser mode (without the Tauri desktop backend).
 *
 * The extension's content script sends messages via window.postMessage,
 * and this bridge receives and processes them.
 */

import { createExtract, type CreateExtractInput } from '../api/extracts';
import * as db from './database';

// Message types from the browser extension
interface ExtensionMessage {
  source: 'incrementum-extension';
  action: 'saveExtract' | 'savePage' | 'ping' | 'getStatus';
  data?: {
    url: string;
    title: string;
    text: string;
    html_content?: string;
    context?: string;
    tags?: string[];
    priority?: number;
  };
  requestId?: string;
}

interface BridgeResponse {
  source: 'incrementum-pwa';
  action: string;
  success: boolean;
  error?: string;
  requestId?: string;
  data?: unknown;
}

// Track if bridge is initialized
let bridgeInitialized = false;

/**
 * Send response back to the extension
 */
function sendResponse(response: BridgeResponse): void {
  window.postMessage(response, '*');
}

/**
 * Handle incoming messages from the extension
 */
async function handleExtensionMessage(event: MessageEvent): Promise<void> {
  // Only handle messages from the same window (extension content script)
  if (event.source !== window) return;

  // Verify message is from our extension
  const message = event.data as ExtensionMessage;
  if (!message || message.source !== 'incrementum-extension') return;

  console.log('[PWA Bridge] Received message:', message.action);

  try {
    switch (message.action) {
      case 'ping': {
        // Extension is checking if PWA is available
        sendResponse({
          source: 'incrementum-pwa',
          action: 'pong',
          success: true,
          requestId: message.requestId,
          data: { version: '1.0.0', mode: 'pwa' }
        });
        break;
      }

      case 'getStatus': {
        sendResponse({
          source: 'incrementum-pwa',
          action: 'status',
          success: true,
          requestId: message.requestId,
          data: { connected: true, mode: 'pwa' }
        });
        break;
      }

      case 'saveExtract': {
        if (!message.data) {
          sendResponse({
            source: 'incrementum-pwa',
            action: 'saveExtract',
            success: false,
            error: 'No data provided',
            requestId: message.requestId
          });
          return;
        }

        const { url, title, text, html_content, context, tags } = message.data;

        // Create or find document for this URL
        let docId = `web-${Date.now()}`;

        // Try to find existing document by URL
        const existingDocs = await db.getDocuments();
        const existingDoc = existingDocs.find(d => d.file_path === url);
        if (existingDoc) {
          docId = existingDoc.id;
        } else {
          // Create new document for this URL
          await db.createDocument({
            id: docId,
            title: title || 'Untitled',
            file_path: url,
            file_type: 'html',
            tags: tags || [],
          });
        }

        // Create the extract with rich HTML content
        const extractInput: CreateExtractInput = {
          document_id: docId,
          content: text,
          html_content: html_content,
          source_url: url,
          note: context,
          tags: tags,
          color: 'yellow',
        };

        const extract = await createExtract(extractInput);

        sendResponse({
          source: 'incrementum-pwa',
          action: 'saveExtract',
          success: true,
          requestId: message.requestId,
          data: { extractId: extract.id }
        });

        // Show notification to user
        showNotification('Extract saved', `Saved from ${new URL(url).hostname}`);
        break;
      }

      case 'savePage': {
        if (!message.data) {
          sendResponse({
            source: 'incrementum-pwa',
            action: 'savePage',
            success: false,
            error: 'No data provided',
            requestId: message.requestId
          });
          return;
        }

        const { url, title, text, html_content, tags } = message.data;

        // Create document for this page
        const doc = await db.createDocument({
          title: title || 'Untitled',
          file_path: url,
          file_type: 'html',
          content: text,
          html_content: html_content,
          tags: tags || [],
        });

        sendResponse({
          source: 'incrementum-pwa',
          action: 'savePage',
          success: true,
          requestId: message.requestId,
          data: { documentId: doc.id }
        });

        showNotification('Page saved', title || 'Untitled');
        break;
      }

      default:
        console.log('[PWA Bridge] Unknown action:', message.action);
        sendResponse({
          source: 'incrementum-pwa',
          action: message.action,
          success: false,
          error: `Unknown action: ${message.action}`,
          requestId: message.requestId
        });
    }
  } catch (error) {
    console.error('[PWA Bridge] Error handling message:', error);
    sendResponse({
      source: 'incrementum-pwa',
      action: message.action,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: message.requestId
    });
  }
}

/**
 * Show a notification to the user
 */
function showNotification(title: string, message: string): void {
  // Try native notification first
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message, icon: '/icon-192.png' });
  } else {
    // Fallback to custom toast notification
    const toast = document.createElement('div');
    toast.className = 'incrementum-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 100000;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
      ">
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="opacity: 0.9;">${message}</div>
      </div>
    `;
    document.body.appendChild(toast);

    // Animate in
    const toastEl = toast.firstElementChild as HTMLElement;
    requestAnimationFrame(() => {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateY(0)';
    });

    // Remove after delay
    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

/**
 * Initialize the browser extension bridge
 * Call this when the app starts in PWA mode
 */
export function initExtensionBridge(): void {
  if (bridgeInitialized) return;

  // Listen for messages from the extension content script
  window.addEventListener('message', handleExtensionMessage);

  // Announce that PWA is ready to receive messages
  window.postMessage({
    source: 'incrementum-pwa',
    action: 'ready',
    success: true
  }, '*');

  bridgeInitialized = true;
  console.log('[PWA Bridge] Browser extension bridge initialized');
}

/**
 * Check if we're running in PWA mode (not Tauri desktop)
 */
export function isPWAMode(): boolean {
  return !('__TAURI__' in window);
}

/**
 * Cleanup the bridge (call on unmount)
 */
export function cleanupExtensionBridge(): void {
  if (!bridgeInitialized) return;
  window.removeEventListener('message', handleExtensionMessage);
  bridgeInitialized = false;
  console.log('[PWA Bridge] Browser extension bridge cleaned up');
}
