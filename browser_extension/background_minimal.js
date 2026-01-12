// Minimal background script for debugging
console.log('Background script starting...');

// Test Chrome APIs availability
console.log('Chrome object:', typeof chrome);
console.log('Chrome.runtime:', typeof chrome?.runtime);
console.log('Chrome.tabs:', typeof chrome?.tabs);
console.log('Chrome.contextMenus:', typeof chrome?.contextMenus);
console.log('Chrome.commands:', typeof chrome?.commands);
console.log('Chrome.storage:', typeof chrome?.storage);

// Simple initialization without complex logic
class MinimalIncrementumSync {
  constructor() {
    console.log('MinimalIncrementumSync constructor called');
    this.serverUrl = 'http://127.0.0.1:8766';
    this.isEnabled = true;
  }

  async init() {
    console.log('MinimalIncrementumSync init called');
    
    try {
      // Test basic Chrome API access
      if (chrome && chrome.runtime) {
        console.log('Chrome runtime available');
        
        // Test message listener
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          console.log('Message received:', message);
          sendResponse({ success: true, message: 'Minimal sync active' });
          return true;
        });
        
        console.log('Message listener set up successfully');
      } else {
        console.error('Chrome runtime not available');
      }
      
      // Test context menus only if available
      if (chrome && chrome.contextMenus) {
        console.log('Setting up minimal context menu...');
        chrome.contextMenus.removeAll(() => {
          if (chrome.runtime.lastError) {
            console.error('Error removing context menus:', chrome.runtime.lastError);
            return;
          }
          
          chrome.contextMenus.create({
            id: 'test-menu',
            title: 'Test Incrementum',
            contexts: ['page']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error creating context menu:', chrome.runtime.lastError);
            } else {
              console.log('Context menu created successfully');
            }
          });
        });
      } else {
        console.log('Context menus not available');
      }
      
      console.log('MinimalIncrementumSync initialized successfully');
      
    } catch (error) {
      console.error('Error in MinimalIncrementumSync init:', error);
    }
  }
}

// Initialize when script loads
console.log('Creating MinimalIncrementumSync instance...');
const minimalSync = new MinimalIncrementumSync();

// Initialize after a short delay to ensure Chrome APIs are ready
setTimeout(() => {
  console.log('Starting initialization...');
  minimalSync.init().catch(error => {
    console.error('Initialization failed:', error);
  });
}, 100);

console.log('Background script setup complete'); 
