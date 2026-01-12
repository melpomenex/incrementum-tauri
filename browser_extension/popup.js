// Popup script for Incrementum Browser Sync

class PopupController {
  constructor() {
    this.extractMode = false;
    this.pageExtracts = [];
    this.apiConfig = null;
    this.init();
  }

  async init() {
    // Set up event listeners
    this.setupEventListeners();

    // Load initial data
    await this.loadStatus();
    await this.loadStats();
    await this.checkExtractMode();
  }

  setupEventListeners() {
    // Save action buttons
    document.getElementById('save-current-tab').addEventListener('click', () => {
      this.saveCurrentTab();
    });

    document.getElementById('save-all-tabs').addEventListener('click', () => {
      this.saveAllTabs();
    });

    // Extract mode buttons
    document.getElementById('toggle-extract-mode').addEventListener('click', () => {
      this.toggleExtractMode();
    });

    document.getElementById('quick-extract').addEventListener('click', () => {
      this.quickExtract();
    });

    document.getElementById('toggle-highlights').addEventListener('click', () => {
      this.toggleHighlights();
    });

    // Connection test
    document.getElementById('test-connection').addEventListener('click', () => {
      this.testConnection();
    });

    // Options link
    document.getElementById('options-link').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
  
  async loadStatus() {
    try {
      const response = await this.sendMessage({ action: 'getStatus' });
      
      if (response) {
        this.updateConnectionStatus(response.connected);
      }
    } catch (error) {
      console.error('Error loading status:', error);
      this.updateConnectionStatus(false);
    }
  }
  
  async loadStats() {
    try {
      // Load extract stats from current page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || this.isInternalUrl(tab.url)) {
        document.getElementById('extracts-count').textContent = '0';
        document.getElementById('highlights-count').textContent = '0';
        this.pageExtracts = [];
        return;
      }
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageStats' });
      
      if (response && response.success) {
        document.getElementById('extracts-count').textContent = response.extractsCount || '0';
        document.getElementById('highlights-count').textContent = response.highlightsCount || '0';
        this.pageExtracts = response.extracts || [];
      } else {
        document.getElementById('extracts-count').textContent = '0';
        document.getElementById('highlights-count').textContent = '0';
        this.pageExtracts = [];
      }
      
    } catch (error) {
      console.error('Error loading stats:', error);
      document.getElementById('extracts-count').textContent = '?';
      document.getElementById('highlights-count').textContent = '?';
    }
  }

  async saveCurrentTab() {
    const button = document.getElementById('save-current-tab');
    const originalContent = button.innerHTML;

    try {
      button.disabled = true;
      this.setButtonLoading(button, true);

      const response = await this.sendMessage({ action: 'saveCurrentTab' });

      if (response && response.success) {
        this.showNotification('Current tab saved successfully!', 'success');
      } else {
        this.showNotification(response?.error || 'Failed to save tab', 'error');
      }
    } catch (error) {
      console.error('Error saving current tab:', error);
      this.showNotification('Error saving tab', 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  }
  
  async saveAllTabs() {
    const button = document.getElementById('save-all-tabs');
    const originalText = button.innerHTML;
    
    try {
      button.disabled = true;
      button.innerHTML = '<div class="loading"></div> Saving...';
      
      const response = await this.sendMessage({ action: 'saveAllTabs' });
      
      if (response && response.success) {
        const successful = response.successful || 0;
        const total = response.total || 0;
        this.showNotification(`Saved ${successful}/${total} tabs successfully!`, 'success');
      } else {
        this.showNotification(response?.error || 'Failed to save tabs', 'error');
      }
    } catch (error) {
      console.error('Error saving all tabs:', error);
      this.showNotification('Error saving tabs', 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
  
  async testConnection() {
    const link = document.getElementById('test-connection');
    const originalText = link.textContent;
    
    try {
      link.textContent = 'Testing...';
      
      const response = await this.sendMessage({ action: 'testConnection' });
      
      if (response && response.connected) {
        this.showNotification('Connection successful!', 'success');
        this.updateConnectionStatus(true);
      } else {
        this.showNotification('Connection failed. Check if Incrementum is running.', 'error');
        this.updateConnectionStatus(false);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      this.showNotification('Connection test failed', 'error');
      this.updateConnectionStatus(false);
    } finally {
      link.textContent = originalText;
    }
  }
  
  updateConnectionStatus(connected) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (connected) {
      indicator.classList.add('connected');
      indicator.classList.remove('disconnected');
      statusText.textContent = 'Connected';
    } else {
      indicator.classList.remove('connected');
      indicator.classList.add('disconnected');
      statusText.textContent = 'Disconnected';
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    notification.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300);
    }, 3000);
  }
  
  // Helper method to set button loading state
  setButtonLoading(button, isLoading) {
    const icon = button.querySelector('.btn-icon');
    const text = button.querySelector('.btn-text > div:first-child');

    if (isLoading) {
      if (icon) icon.style.display = 'none';
      if (text) text.innerHTML = 'Processing...';
    } else {
      if (icon) icon.style.display = 'block';
      // Reset text when needed
    }
  }

  // Check extract mode status
  async checkExtractMode() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && !this.isInternalUrl(tab.url)) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getExtractModeStatus' });
        if (response && response.extractMode !== undefined) {
          this.updateExtractModeIndicator(response.extractMode);
        }
      }
    } catch (error) {
      this.handleContentScriptError(error);
    }
  }

  // Toggle extract mode
  async toggleExtractMode() {
    try {
      const button = document.getElementById('toggle-extract-mode');
      const originalContent = button.innerHTML;

      button.disabled = true;
      this.setButtonLoading(button, true);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && !this.isInternalUrl(tab.url)) {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtractMode' });

        // Check the new status
        setTimeout(() => {
          this.checkExtractMode();
        }, 100);
      } else {
        this.showNotification('Extract mode not available on this page.', 'info');
      }
    } catch (error) {
      this.handleContentScriptError(error, 'Error toggling extract mode');
    } finally {
      const button = document.getElementById('toggle-extract-mode');
      button.disabled = false;
      button.innerHTML = button.innerHTML.replace('Processing...', 'Toggle Extract Mode');
    }
  }

  // Quick extract from selection
  async quickExtract() {
    try {
      const button = document.getElementById('quick-extract');
      const originalContent = button.innerHTML;

      button.disabled = true;
      this.setButtonLoading(button, true);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && !this.isInternalUrl(tab.url)) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });

        if (response && response.success && response.text) {
          const result = await this.sendMessage({
            action: 'createExtract',
            data: {
              text: response.text,
              url: tab.url,
              title: tab.title
            }
          });

          if (result && result.success) {
            this.showNotification('Extract created successfully!', 'success');
            await this.loadStats(); // Refresh stats
          } else {
            this.showNotification(result?.error || 'Failed to create extract', 'error');
          }
        } else {
          this.showNotification('No text selected. Please select some text first.', 'info');
        }
      } else {
        this.showNotification('Extract mode not available on this page.', 'info');
      }
    } catch (error) {
      this.handleContentScriptError(error, 'Error creating extract');
    } finally {
      const button = document.getElementById('quick-extract');
      button.disabled = false;
      button.innerHTML = button.innerHTML.replace('Processing...', 'Quick Extract');
    }
  }

  // Toggle highlights
  async toggleHighlights() {
    try {
      const button = document.getElementById('toggle-highlights');
      const originalContent = button.innerHTML;

      button.disabled = true;
      this.setButtonLoading(button, true);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && !this.isInternalUrl(tab.url)) {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleHighlights' });
      } else {
        this.showNotification('Highlights not available on this page.', 'info');
      }
    } catch (error) {
      this.handleContentScriptError(error, 'Error toggling highlights');
    } finally {
      const button = document.getElementById('toggle-highlights');
      button.disabled = false;
      button.innerHTML = button.innerHTML.replace('Processing...', 'Toggle Highlights');
    }
  }

  // Update extract mode indicator
  updateExtractModeIndicator(isActive) {
    this.extractMode = isActive;
    const indicator = document.getElementById('extract-mode-indicator');

    if (isActive) {
      indicator.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  isInternalUrl(url) {
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

  handleContentScriptError(error, fallbackMessage = 'Action failed') {
    const message = error?.message || '';
    if (message.includes('Receiving end does not exist')) {
      this.showNotification('This page does not allow extension content scripts.', 'info');
      return;
    }
    console.error(fallbackMessage + ':', error);
    this.showNotification(fallbackMessage, 'error');
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
