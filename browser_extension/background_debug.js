// Debug version of background script to isolate the error
console.log('🚀 Background script starting...');

// Test Chrome APIs step by step
console.log('Testing Chrome APIs...');
console.log('chrome:', typeof chrome);
console.log('chrome.runtime:', typeof chrome?.runtime);
console.log('chrome.tabs:', typeof chrome?.tabs);
console.log('chrome.contextMenus:', typeof chrome?.contextMenus);
console.log('chrome.commands:', typeof chrome?.commands);
console.log('chrome.storage:', typeof chrome?.storage);
console.log('chrome.notifications:', typeof chrome?.notifications);

// Test each API individually
function testChromeAPIs() {
  console.log('🔍 Testing Chrome APIs individually...');
  
  // Test runtime
  try {
    if (chrome && chrome.runtime) {
      console.log('✅ chrome.runtime available');
      console.log('chrome.runtime.onMessage:', typeof chrome.runtime.onMessage);
    } else {
      console.error('❌ chrome.runtime not available');
    }
  } catch (error) {
    console.error('❌ Error testing chrome.runtime:', error);
  }
  
  // Test tabs
  try {
    if (chrome && chrome.tabs) {
      console.log('✅ chrome.tabs available');
      console.log('chrome.tabs.query:', typeof chrome.tabs.query);
    } else {
      console.error('❌ chrome.tabs not available');
    }
  } catch (error) {
    console.error('❌ Error testing chrome.tabs:', error);
  }
  
  // Test contextMenus
  try {
    if (chrome && chrome.contextMenus) {
      console.log('✅ chrome.contextMenus available');
      console.log('chrome.contextMenus.create:', typeof chrome.contextMenus.create);
      console.log('chrome.contextMenus.removeAll:', typeof chrome.contextMenus.removeAll);
    } else {
      console.error('❌ chrome.contextMenus not available');
    }
  } catch (error) {
    console.error('❌ Error testing chrome.contextMenus:', error);
  }
  
  // Test commands
  try {
    if (chrome && chrome.commands) {
      console.log('✅ chrome.commands available');
      console.log('chrome.commands.onCommand:', typeof chrome.commands.onCommand);
    } else {
      console.error('❌ chrome.commands not available');
    }
  } catch (error) {
    console.error('❌ Error testing chrome.commands:', error);
  }
  
  // Test storage
  try {
    if (chrome && chrome.storage) {
      console.log('✅ chrome.storage available');
      console.log('chrome.storage.sync:', typeof chrome.storage.sync);
    } else {
      console.error('❌ chrome.storage not available');
    }
  } catch (error) {
    console.error('❌ Error testing chrome.storage:', error);
  }
  
  // Test notifications
  try {
    if (chrome && chrome.notifications) {
      console.log('✅ chrome.notifications available');
      console.log('chrome.notifications.create:', typeof chrome.notifications.create);
    } else {
      console.error('❌ chrome.notifications not available');
    }
  } catch (error) {
    console.error('❌ Error testing chrome.notifications:', error);
  }
}

// Test context menu creation specifically
function testContextMenuCreation() {
  console.log('🔍 Testing context menu creation...');
  
  try {
    if (!chrome || !chrome.contextMenus) {
      console.error('❌ chrome.contextMenus not available for context menu test');
      return;
    }
    
    console.log('Attempting to remove all context menus...');
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error removing context menus:', chrome.runtime.lastError);
        return;
      }
      
      console.log('✅ Context menus removed successfully');
      
      console.log('Attempting to create test context menu...');
      chrome.contextMenus.create({
        id: 'debug-test-menu',
        title: 'Debug Test Menu',
        contexts: ['page']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error creating context menu:', chrome.runtime.lastError);
        } else {
          console.log('✅ Context menu created successfully');
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error in context menu test:', error);
  }
}

// Test message listener
function testMessageListener() {
  console.log('🔍 Testing message listener...');
  
  try {
    if (!chrome || !chrome.runtime) {
      console.error('❌ chrome.runtime not available for message listener test');
      return;
    }
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Message received:', message);
      sendResponse({ success: true, debug: true });
      return true;
    });
    
    console.log('✅ Message listener set up successfully');
    
  } catch (error) {
    console.error('❌ Error setting up message listener:', error);
  }
}

// Run tests in sequence
console.log('🧪 Starting Chrome API tests...');

// Test immediately
testChromeAPIs();

// Test after a short delay to ensure APIs are ready
setTimeout(() => {
  console.log('🧪 Running delayed tests...');
  testContextMenuCreation();
  testMessageListener();
}, 100);

console.log('🏁 Debug background script setup complete'); 