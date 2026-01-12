// Options page script for Incrementum Browser Sync

class OptionsController {
    constructor() {
        this.defaultSettings = {
            serverUrl: 'http://127.0.0.1',
            browserSyncPort: 8766,
            autoSave: false,
            autoExtract: false,
            enableContextMenu: true,
            enableNotifications: true,
            enableHighlights: true,
            enableAutoSync: false,
            saveHistory: true,
            saveBookmarks: true,
            syncFrequency: 'manual'
        };

        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        await this.testConnection(false); // Test connection silently on load
    }

    setupEventListeners() {
        // Save settings button
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset settings button
        document.getElementById('reset-settings').addEventListener('click', () => {
            this.resetSettings();
        });

        // Test connection button
        document.getElementById('test-connection').addEventListener('click', () => {
            this.testConnection(true);
        });

        // Live connection testing for server URL changes
        document.getElementById('server-url').addEventListener('input', (e) => {
            this.debounceConnectionTest(() => {
                this.testConnection(false);
            }, 1000);
        });

        document.getElementById('port').addEventListener('input', (e) => {
            this.debounceConnectionTest(() => {
                this.testConnection(false);
            }, 1000);
        });

        // Auto-save server URL changes
        const autoSaveFields = ['auto-save', 'auto-extract', 'enable-context-menu',
                                'enable-notifications', 'enable-highlights', 'enable-auto-sync',
                                'save-history', 'save-bookmarks', 'sync-frequency'];

        autoSaveFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('change', () => {
                    this.saveSettings(false); // Save silently
                });
            }
        });
    }

    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get(this.defaultSettings);

            // Update form fields with loaded settings
            let serverUrl = settings.serverUrl || this.defaultSettings.serverUrl;
            // Display URL without protocol for cleaner UI
            if (serverUrl.startsWith('http://')) {
                serverUrl = serverUrl.substring(7);
            } else if (serverUrl.startsWith('https://')) {
                serverUrl = serverUrl.substring(8);
            }

            document.getElementById('server-url').value = serverUrl;
            document.getElementById('port').value = settings.browserSyncPort || this.defaultSettings.browserSyncPort;
            document.getElementById('auto-save').checked = settings.autoSave || this.defaultSettings.autoSave;
            document.getElementById('auto-extract').checked = settings.autoExtract || this.defaultSettings.autoExtract;
            document.getElementById('enable-context-menu').checked = settings.enableContextMenu !== false;
            document.getElementById('enable-notifications').checked = settings.enableNotifications !== false;
            document.getElementById('enable-highlights').checked = settings.enableHighlights !== false;
            document.getElementById('enable-auto-sync').checked = settings.enableAutoSync || this.defaultSettings.enableAutoSync;
            document.getElementById('save-history').checked = settings.saveHistory !== false;
            document.getElementById('save-bookmarks').checked = settings.saveBookmarks !== false;
            document.getElementById('sync-frequency').value = settings.syncFrequency || this.defaultSettings.syncFrequency;

        } catch (error) {
            console.error('Error loading settings:', error);
            this.showNotification('Error loading settings', 'error');
        }
    }

    async saveSettings(showNotification = true) {
        try {
            let serverUrl = document.getElementById('server-url').value.trim();

            // Remove any port from the server URL to avoid confusion
            serverUrl = serverUrl.replace(/:\d+/, '');

            // Normalize server URL - ensure it has protocol
            if (serverUrl && !serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
                serverUrl = `http://${serverUrl}`;
            }

            const settings = {
                serverUrl: serverUrl,
                browserSyncPort: parseInt(document.getElementById('port').value) || this.defaultSettings.browserSyncPort,
                autoSave: document.getElementById('auto-save').checked,
                autoExtract: document.getElementById('auto-extract').checked,
                enableContextMenu: document.getElementById('enable-context-menu').checked,
                enableNotifications: document.getElementById('enable-notifications').checked,
                enableHighlights: document.getElementById('enable-highlights').checked,
                enableAutoSync: document.getElementById('enable-auto-sync').checked,
                saveHistory: document.getElementById('save-history').checked,
                saveBookmarks: document.getElementById('save-bookmarks').checked,
                syncFrequency: document.getElementById('sync-frequency').value
            };

            // Validate settings
            if (!this.validateSettings(settings)) {
                return;
            }

            await chrome.storage.sync.set(settings);

            // Notify background script of settings change
            chrome.runtime.sendMessage({ action: 'settingsChanged', settings });

            if (showNotification) {
                this.showNotification('Settings saved successfully!', 'success');
            }

        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings: ' + error.message, 'error');
        }
    }

    validateSettings(settings) {
        // Validate server URL - be more lenient
        const url = settings.serverUrl.trim();
        if (!url) {
            this.showNotification('Please enter a server URL', 'error');
            return false;
        }

        // Basic URL validation - accept common formats
        try {
            // If no protocol specified, add http://
            const testUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
            new URL(testUrl);
        } catch (error) {
            this.showNotification('Invalid server address format', 'error');
            return false;
        }

        // Validate port
        if (settings.browserSyncPort < 1 || settings.browserSyncPort > 65535) {
            this.showNotification('Port must be between 1 and 65535', 'error');
            return false;
        }

        return true;
    }

    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to their defaults?')) {
            return;
        }

        try {
            await chrome.storage.sync.clear();
            await this.loadSettings();
            this.showNotification('Settings reset to defaults', 'info');
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showNotification('Error resetting settings', 'error');
        }
    }

    async testConnection(showLoading = true) {
        let serverUrl = document.getElementById('server-url').value.trim();
        const port = parseInt(document.getElementById('port').value) || this.defaultSettings.browserSyncPort;

        if (!serverUrl) {
            this.updateConnectionStatus(false, 'Please enter a server URL');
            return;
        }

        // Check if the server URL already includes a port
        const urlHasPort = /:\d+/.test(serverUrl);
        if (urlHasPort && showLoading) {
            this.showNotification('Note: Server address includes a port. Using the separate port field instead.', 'info');
        }

        // Normalize URL format
        if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
            serverUrl = `http://${serverUrl}`;
        }

        // Remove any port from the server URL and use the dedicated port field instead
        const cleanUrl = serverUrl.replace(/:\d+/, '');

        // Use the configured port from the port field
        const url = new URL(cleanUrl);
        url.port = port;

        const fullUrl = url.toString();
        console.log('Options page testing URL:', fullUrl);

        if (showLoading) {
            document.getElementById('loading').classList.add('show');
        }

        try {
            // BrowserSyncServer only handles POST requests to the root endpoint
            // Test connectivity with a simple POST request
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    test: true,
                    source: 'options_page',
                    timestamp: new Date().toISOString()
                }),
                signal: AbortSignal.timeout(5000) // Modern timeout approach
            });

            console.log('Options page response:', response.status, response.ok);
            // Any response (including 200, 400, etc.) means the server is running
            // The BrowserSyncServer always returns a response for POST requests
            this.updateConnectionStatus(true, `Connected to BrowserSync server (status: ${response.status})`);

            if (showLoading) {
                this.showNotification('Connection successful!', 'success');
            }

        } catch (error) {
            console.error('Connection test error:', error);

            let errorMessage = 'Connection failed';
            if (error.name === 'TypeError') {
                errorMessage = 'Invalid server address or network error';
            } else if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                errorMessage = 'Connection timeout - server may be busy';
            } else if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Connection refused - is Incrementum running?';
            } else if (error.message.includes('ENOTFOUND')) {
                errorMessage = 'Server address not found';
            } else if (error.message.includes('ERR_NETWORK_CHANGED')) {
                errorMessage = 'Network connection changed';
            }

            this.updateConnectionStatus(false, errorMessage);

            if (showLoading) {
                this.showNotification(errorMessage, 'error');
            }
        } finally {
            document.getElementById('loading').classList.remove('show');
        }
    }

    updateConnectionStatus(connected, message = '') {
        const statusElement = document.getElementById('connection-status');
        const indicatorElement = document.getElementById('status-indicator');
        const textElement = document.getElementById('status-text');

        if (connected) {
            statusElement.className = 'connection-status connected';
            indicatorElement.className = 'status-indicator connected';
            textElement.textContent = message || 'Connected';
        } else {
            statusElement.className = 'connection-status disconnected';
            indicatorElement.className = 'status-indicator disconnected';
            textElement.textContent = message || 'Disconnected';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Debounce function to prevent excessive API calls
    debounceConnectionTest(func, delay) {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }

        this.connectionTimeout = setTimeout(func, delay);
    }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsController();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save settings
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('save-settings').click();
    }

    // Escape to close notifications
    if (e.key === 'Escape') {
        const notification = document.getElementById('notification');
        notification.classList.remove('show');
    }
});
