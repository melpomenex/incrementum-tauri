// Background service worker for Incrementum Browser Sync
// Handles tab monitoring, bookmark syncing, and communication with Incrementum

let INCREMENTUM_BASE_URL = 'http://127.0.0.1:8766';
let ENABLE_CONTEXT_MENU = true;
let ENABLE_NOTIFICATIONS = true;

function browserSyncEndpoint() {
  // Always hit the root path; QHttpServer is routed on "/"
  return new URL('/', INCREMENTUM_BASE_URL).toString();
}

// Load settings and update base URL
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get(['serverUrl', 'browserSyncPort', 'enableContextMenu', 'enableNotifications']);
    console.log('[DEBUG] Raw settings from storage:', settings);

    // Build URL from components
    let serverUrl = settings.serverUrl || '127.0.0.1';
    let port = settings.browserSyncPort || 8766;

    console.log('[DEBUG] Using serverUrl:', serverUrl, 'port:', port);

    // Remove any existing port from serverUrl to avoid duplication
    serverUrl = serverUrl.replace(/:\d+$/, '');

    // Ensure serverUrl has protocol
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `http://${serverUrl}`;
    }

    // Construct final URL with port
    const url = new URL(serverUrl);
    url.port = port.toString();
    // Use origin to avoid accidental double-slashes when appending "/"
    INCREMENTUM_BASE_URL = url.origin;

    ENABLE_CONTEXT_MENU = settings.enableContextMenu !== false;
    ENABLE_NOTIFICATIONS = settings.enableNotifications !== false;
    console.log('[DEBUG] Constructed final URL:', INCREMENTUM_BASE_URL);
  } catch (error) {
    console.error('[DEBUG] Error loading settings:', error);
    INCREMENTUM_BASE_URL = 'http://127.0.0.1:8766'; // Fallback
    ENABLE_CONTEXT_MENU = true;
    ENABLE_NOTIFICATIONS = true;
    console.log('[DEBUG] Using fallback URL:', INCREMENTUM_BASE_URL);
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Incrementum Browser Sync installed');

  // Load extension settings
  await loadSettings();

  // Create context menu items
  refreshContextMenus();
});

// Service worker startup event
chrome.runtime.onStartup.addListener(async () => {
  console.log('[DEBUG] Service worker starting up');
  await loadSettings();
  refreshContextMenus();
});

// Keep service worker active when needed
chrome.action.onClicked.addListener((tab) => {
  console.log('[DEBUG] Extension icon clicked');
});


// Create context menu items
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Save page context menu
    chrome.contextMenus.create({
      id: 'save-page',
      title: '💾 Save to Incrementum',
      contexts: ['page']
    });

    // Save link context menu
    chrome.contextMenus.create({
      id: 'save-link',
      title: '🔗 Save Link to Incrementum',
      contexts: ['link']
    });

    // Extract selection context menu
    chrome.contextMenus.create({
      id: 'create-extract',
      title: '📝 Create Extract',
      contexts: ['selection']
    });
  });
}

function refreshContextMenus() {
  if (!chrome?.contextMenus) {
    return;
  }
  if (ENABLE_CONTEXT_MENU) {
    createContextMenus();
  } else {
    chrome.contextMenus.removeAll();
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'save-page':
      await saveCurrentTab();
      break;

    case 'save-link':
      if (info.linkUrl) {
        await saveLink(info.linkUrl, tab?.id);
      }
      break;

    case 'create-extract':
      if (info.selectionText) {
        await createExtractFromSelection(info.selectionText, tab);
      }
      break;
  }
});

// Handle messages from popup and content scripts
// NOTE: In MV3, onMessage listeners must not be `async`, otherwise the returned Promise
// can cause Chrome to close the message channel before `sendResponse()` runs.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DEBUG] Background received message:', message?.action, message);

  (async () => {
    try {
      switch (message.action) {
        case 'getStatus': {
          const statusResponse = await getStatus();
          console.log('[DEBUG] getStatus response:', statusResponse);
          sendResponse(statusResponse);
          break;
        }

        case 'saveCurrentTab': {
          console.log('[DEBUG] Processing saveCurrentTab request');
          try {
            const saveResponse = await saveCurrentTab();
            console.log('[DEBUG] saveCurrentTab response:', saveResponse);
            sendResponse(saveResponse);
            console.log('[DEBUG] saveCurrentTab response sent');
          } catch (error) {
            console.error('[DEBUG] Error in saveCurrentTab handler:', error);
            sendResponse({ success: false, error: error.message });
            console.log('[DEBUG] saveCurrentTab error response sent');
          }
          break;
        }

        case 'saveAllTabs':
          sendResponse(await saveAllTabs());
          break;

        case 'testConnection':
          sendResponse(await testConnection());
          break;

        case 'sendToIncrementum':
          sendResponse(await sendToIncrementum(message.data));
          break;

        case 'createExtract': {
          if (message.data && message.data.text) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
              sendResponse(await createExtractFromSelection(message.data.text, tab));
            } else {
              sendResponse({ success: false, error: 'No active tab found' });
            }
          } else {
            sendResponse({ success: false, error: 'No text provided for extract' });
          }
          break;
        }

        case 'settingsChanged':
          // Reload settings when they change
          await loadSettings();
          console.log('Settings reloaded after change, new URL:', INCREMENTUM_BASE_URL);

          // Update context menus if needed
          if (message.settings && message.settings.enableContextMenu !== undefined) {
            ENABLE_CONTEXT_MENU = message.settings.enableContextMenu !== false;
            refreshContextMenus();
          }
          if (message.settings && message.settings.enableNotifications !== undefined) {
            ENABLE_NOTIFICATIONS = message.settings.enableNotifications !== false;
          }

          sendResponse({ success: true });
          break;

        case 'saveExtract':
        case 'saveExtractWithPriority': {
          const extract = message.extract || {};
          const text = (extract.text || '').trim();
          const url = extract.url || sender?.tab?.url || '';
          const title = extract.title || sender?.tab?.title || 'Untitled';

          if (!text) {
            sendResponse({ success: false, error: 'No text provided for extract' });
            break;
          }

          if (!url) {
            sendResponse({ success: false, error: 'No URL provided for extract' });
            break;
          }

          const response = await sendToIncrementum({
            url,
            title,
            text,
            html_content: extract.html_content, // Include rich HTML content
            type: 'extract',
            context: extract.context,
            tags: extract.tags,
            priority: extract.priority,
            analysis: extract.analysis,
            fsrs_data: extract.fsrs_data
          });

          sendResponse(response);
          break;
        }

        case 'generateAISummary': {
          const data = message.data || {};
          if (!data.content) {
            sendResponse({ success: false, error: 'No content provided for analysis' });
            break;
          }

          const aiResponse = await requestAIAnalysis(data);
          sendResponse(aiResponse);
          break;
        }

        case 'getAIStatus': {
          const statusResult = await checkAIStatus();
          sendResponse(statusResult);
          break;
        }

        default:
          console.log('[DEBUG] Unknown action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[DEBUG] Error in message handler:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// Get connection status
async function getStatus() {
  try {
    await loadSettings();
    console.log('Status check - URL:', INCREMENTUM_BASE_URL);

    // Since BrowserSyncServer only handles POST requests, test connectivity differently
    // Try to make a simple POST request with minimal data to test server availability
    const response = await fetch(browserSyncEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true, source: 'status_check' })
    });

    console.log('Status check response:', response.status, response.ok);
    // Any response (including 400) means the server is reachable
    return { connected: true, status: response.status };
  } catch (error) {
    console.error('Error checking status:', error);
    return { connected: false, error: error.message };
  }
}

// Test connection
async function testConnection() {
  try {
    console.log('[DEBUG] testConnection() called');
    await loadSettings();
    console.log('[DEBUG] Connection test - URL:', INCREMENTUM_BASE_URL);

    const requestBody = JSON.stringify({ test: true, source: 'connection_test', timestamp: new Date().toISOString() });
    console.log('[DEBUG] Sending POST request with body:', requestBody);

    // Test with a simple POST request since that's what the server expects
    const response = await fetch(browserSyncEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    console.log('[DEBUG] Connection test response:', response.status, response.ok);
    // Any response means the server is running
    return { connected: true, status: response.status };
  } catch (error) {
    console.error('[DEBUG] Error testing connection:', error);
    console.error('[DEBUG] Error details:', error.name, error.message);
    return { connected: false, error: error.message };
  }
}

// Save current tab
async function saveCurrentTab() {
  try {
    console.log('[DEBUG] saveCurrentTab function started');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[DEBUG] Active tab:', tab ? { id: tab.id, url: tab.url, title: tab.title } : 'null');

    if (!tab || isInternalUrl(tab.url)) {
      console.log('[DEBUG] Cannot save - internal URL or no tab');
      return { success: false, error: 'Cannot save internal browser pages' };
    }

    console.log('[DEBUG] Calling savePage with:', tab.url, tab.title);
    const result = await savePage(tab.url, tab.title);
    console.log('[DEBUG] savePage result:', result);

    if (result.success) {
      console.log('[DEBUG] savePage successful, showing notification');
      await sendInPageToast(tab.id, result.success, 'Page saved to Incrementum!');
    }

    console.log('[DEBUG] saveCurrentTab returning result:', result);
    return result;
  } catch (error) {
    console.error('[DEBUG] Error in saveCurrentTab:', error);
    return { success: false, error: error.message };
  }
}

// Save all tabs
async function saveAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const validTabs = tabs.filter(tab => tab.url && !isInternalUrl(tab.url));

    let successful = 0;
    const results = await Promise.allSettled(
      validTabs.map(tab => savePage(tab.url, tab.title))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful++;
      }
    });

    return {
      success: true,
      successful,
      total: validTabs.length
    };
  } catch (error) {
    console.error('Error saving all tabs:', error);
    return { success: false, error: error.message };
  }
}

async function sendToIncrementum(data) {
  try {
    console.log('[DEBUG] sendToIncrementum called with:', data);
    await loadSettings();

    // Use the root endpoint as expected by BrowserSyncServer
    const endpoint = browserSyncEndpoint();
    console.log('[DEBUG] sendToIncrementum endpoint:', endpoint);

    const trimmedText = (data.text || '').trim();

    const requestBody = JSON.stringify({
      url: data.url,
      title: data.title || 'Untitled',
      text: trimmedText,
      content: trimmedText, // kept for backward compatibility
      html_content: data.html_content, // Rich HTML content for visual fidelity
      type: data.type || (trimmedText ? 'extract' : 'page'),
      source: data.source || 'browser_extension',
      timestamp: data.timestamp || new Date().toISOString(),
      context: data.context,
      tags: data.tags,
      priority: data.priority,
      analysis: data.analysis,
      fsrs_data: data.fsrs_data
    });

    console.log('[DEBUG] sendToIncrementum request body:', requestBody);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    console.log('[DEBUG] sendToIncrementum response:', response.status, response.ok);

    if (response.ok) {
      // The BrowserSyncServer returns 200 OK without JSON body
      return { success: true, message: 'Data sent successfully' };
    } else {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      return { success: false, error: `Server error: ${response.status}` };
    }
  } catch (error) {
    console.error('[DEBUG] Network error in sendToIncrementum:', error);
    console.error('[DEBUG] Network error details:', error.name, error.message);
    return { success: false, error: error.message };
  }
}
// Save link by opening a tab, extracting content, and saving
async function saveLink(url, sourceTabId) {
  try {
    console.log('[DEBUG] saveLink called for URL:', url);

    // Create a new tab to extract content
    const tab = await chrome.tabs.create({
      url: url,
      active: false  // Don't focus the tab
    });

    // Wait for the tab to finish loading
    await new Promise((resolve) => {
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Additional wait for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to extract page content using the content script
    let pageContent = '';
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getPageContent'
      });
      if (response && response.success && response.content) {
        pageContent = response.content;
        console.log('[DEBUG] Successfully extracted page content, length:', pageContent.length);
      }
    } catch (error) {
      console.log('[DEBUG] Could not get content from content script:', error.message);
    }

    // Get the page title
    const title = tab.title || 'Link saved from context menu';

    // Close the tab
    await chrome.tabs.remove(tab.id);

    // Save to Incrementum
    console.log('[DEBUG] Saving link with content length:', pageContent.length);
    const result = await sendToIncrementum({
      url,
      title,
      text: pageContent
    });
    await sendInPageToast(sourceTabId, result.success, 'Link sent to Incrementum!');
    return result;
  } catch (error) {
    console.error('[DEBUG] Error in saveLink:', error);
    // Fallback: save without content
    const result = await sendToIncrementum({
      url,
      title: 'Link saved from context menu',
      text: ''
    });
    await sendInPageToast(sourceTabId, result.success, 'Link sent to Incrementum!');
    return result;
  }
}


async function savePage(url, title) {
  try {
    // Try to extract page content using the content script
    const tabs = await chrome.tabs.query({ url: url });
    let pageContent = '';

    if (tabs.length > 0 && tabs[0].id) {
      try {
        // Request content from the content script
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'getPageContent'
        });
        if (response && response.success && response.content) {
          pageContent = response.content;
        }
      } catch (error) {
        console.log('[DEBUG] Could not get content from content script:', error.message);
      }
    }

    // If we couldn't get content from the content script, return at least URL and title
    return await sendToIncrementum({
      url,
      title,
      text: pageContent
    });
  } catch (error) {
    console.error('[DEBUG] Error in savePage:', error);
    // Fallback to basic save without content
    return await sendToIncrementum({ url, title, text: '' });
  }
}

// Create extract from selection (context menu)
async function createExtractFromSelection(selectedText, tab) {
  const text = (selectedText || '').trim();
  if (!text) {
    return { success: false, error: 'No selection provided' };
  }
  const result = await sendToIncrementum({ url: tab.url, title: tab.title, text });
  await sendInPageToast(tab?.id, result.success, 'Extract sent to Incrementum!');
  return result;
}

async function sendInPageToast(tabId, success, message) {
  if (!ENABLE_NOTIFICATIONS || !success || !tabId) {
    return;
  }
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'showSaveIndicator',
      text: message
    });
  } catch (error) {
    console.log('[DEBUG] Could not send in-page toast:', error.message);
  }
}


// Helper function to check if URL is internal
function isInternalUrl(url) {
  if (!url) return true;

  const internalPrefixes = [
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'about:',
    'edge://',
    'opera://',
    'brave://'
  ];

  return internalPrefixes.some(prefix => url.startsWith(prefix));
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'save-current-tab':
      await saveCurrentTab();
      break;

    case 'toggle-extract-mode':
      await toggleExtractMode();
      break;

    case 'quick-extract':
      await quickExtract();
      break;

    case 'toggle-highlights':
      await toggleHighlights();
      break;

    case 'save-all-tabs':
      await saveAllTabs();
      break;
  }
});

// Toggle extract mode
async function toggleExtractMode() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtractMode' });
    }
  } catch (error) {
    console.error('Error toggling extract mode:', error);
  }
}

// Quick extract from selection
async function quickExtract() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
      if (response && response.success && response.text) {
        await createExtractFromSelection(response.text, tab);
      } else {
        console.log('No text selected for quick extract');
      }
    }
  } catch (error) {
    console.error('Error in quick extract:', error);
  }
}

// Toggle highlights
async function toggleHighlights() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleHighlights' });
    }
  } catch (error) {
    console.error('Error toggling highlights:', error);
  }
}

// Request AI analysis from desktop app
async function requestAIAnalysis(data) {
  try {
    await loadSettings();
    const endpoint = `${INCREMENTUM_BASE_URL}/ai/process`;

    console.log('[DEBUG] Requesting AI analysis:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: data.content,
        operation: data.operation || 'all',
        max_words: data.max_words || 150,
        count: data.count || 5,
        url: data.url,
        title: data.title
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG] AI request failed:', response.status, errorText);
      return {
        success: false,
        error: response.status === 503
          ? 'AI is not configured. Please configure an AI provider in the desktop app settings.'
          : `AI request failed: ${response.status}`
      };
    }

    const result = await response.json();
    console.log('[DEBUG] AI response:', result);
    return result;

  } catch (error) {
    console.error('[DEBUG] AI analysis error:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to AI service'
    };
  }
}

// Check AI status from desktop app
async function checkAIStatus() {
  try {
    await loadSettings();
    const endpoint = `${INCREMENTUM_BASE_URL}/ai/status`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { configured: false, error: 'Failed to check AI status' };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[DEBUG] AI status check error:', error);
    return { configured: false, error: error.message };
  }
}

console.log('Incrementum background script loaded');

