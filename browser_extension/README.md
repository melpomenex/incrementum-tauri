# Incrementum Browser Extension

A powerful browser extension that seamlessly integrates with Incrementum to capture, extract, and manage web content with AI-powered features.

## 🚀 Features

### 📄 Content Capture
- **Save Current Tab**: Instantly save the current page to Incrementum
- **Save All Tabs**: Batch save all open tabs at once
- **Save with Content**: Capture full page content including HTML
- **Bookmark Sync**: Automatically sync browser bookmarks

### ✂️ Extract Mode
- **Visual Extract Mode**: Toggle extract mode with visual indicators
- **Text Selection**: Select any text to automatically create extracts
- **Context Preservation**: Captures surrounding context for better understanding
- **Smart Highlighting**: Visual highlights for extracted content

### 🎨 Highlighting System
- **Persistent Highlights**: Highlights remain across browser sessions
- **Toggle Visibility**: Show/hide highlights as needed
- **Multiple Colors**: Different highlight colors for organization
- **Cross-Session Storage**: Highlights saved locally and synced

### 🤖 AI Integration
- **AI-Powered Summaries**: Generate intelligent summaries of web pages
- **Multiple AI Providers**: Support for OpenAI, Claude, Gemini, and OpenRouter
- **Automatic API Detection**: Uses Incrementum's configured AI settings
- **Smart Content Analysis**: Contextual understanding for better summaries

### ⌨️ Keyboard Shortcuts
- `Ctrl+Shift+S` (Windows/Linux) / `Cmd+Shift+S` (Mac): Save current tab
- `Ctrl+Shift+A`: Save all tabs
- `Ctrl+Shift+E`: Toggle extract mode
- `Ctrl+Shift+X`: Quick extract selected text
- `Ctrl+Shift+H`: Toggle highlights visibility

### 🖱️ Context Menu Integration
- **Right-click Menu**: Access all features via context menu
- **Selection-Aware**: Different options based on text selection
- **Quick Actions**: Fast access to common operations

### 🔧 Management Features
- **Item Management**: View, filter, and organize synced content
- **Selective Deletion**: Choose specific items to remove
- **Bulk Operations**: Clear processed items or all data
- **Statistics**: Track sync activity and content types

## 📦 Installation

### Prerequisites
1. **Incrementum Application**: Must be running with browser sync enabled
2. **Chrome Browser**: Extension currently supports Chrome/Chromium browsers
3. **API Keys**: Optional, for AI summary features (configured in Incrementum)

### Installation Steps

1. **Download the Extension**
   ```bash
   # Clone or download the browser_extension folder
   git clone <repository-url>
   cd incrementum/browser_extension
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `browser_extension` folder
   - The extension should appear in your extensions list

3. **Verify Installation**
   - Look for the Incrementum icon in your browser toolbar
   - Click the icon to open the popup
   - Check that the status shows "Connected"

## 🔧 Configuration

### Incrementum Setup
1. **Start Incrementum**: Ensure the main application is running
2. **Enable Browser Sync**: Go to Settings → Browser Sync → Enable
3. **Configure AI** (Optional): Set up API keys in Settings → AI for summary features

### Extension Settings
- **Server Port**: Default is 8766 (matches Incrementum default)
- **Auto-Connect**: Extension automatically connects to Incrementum
- **Permissions**: Grant necessary permissions when prompted

## 📖 Usage Guide

### Basic Content Saving

#### Save Current Page
1. **Method 1**: Click extension icon → "Save Current Tab"
2. **Method 2**: Use keyboard shortcut `Ctrl+Shift+S`
3. **Method 3**: Right-click on page → "Save to Incrementum"

#### Save Multiple Tabs
1. Click extension icon → "Save All Tabs"
2. Use keyboard shortcut `Ctrl+Shift+A`
3. All open tabs will be queued for saving

### Extract Mode Usage

#### Enabling Extract Mode
1. **Visual Toggle**: Click extension icon → "Toggle Extract Mode"
2. **Keyboard**: Press `Ctrl+Shift+E`
3. **Context Menu**: Right-click → "Toggle Extract Mode"

#### Creating Extracts
1. **Enable extract mode** (page border will change color)
2. **Select text** you want to extract
3. **Automatic saving**: Selected text is automatically saved as an extract
4. **Visual feedback**: Text is highlighted and notification appears

#### Managing Highlights
- **Toggle visibility**: Press `Ctrl+Shift+H` to show/hide highlights
- **Persistent storage**: Highlights remain after page refresh
- **Cross-session**: Highlights saved across browser sessions

### AI Summary Generation

#### Generate Summary
1. **Navigate** to the page you want to summarize
2. **Click extension icon** → "Generate Summary"
3. **Wait for processing** (may take 10-30 seconds)
4. **Check Incrementum** for the generated summary document

#### Requirements
- **API Key**: Must be configured in Incrementum settings
- **Supported Providers**: OpenAI, Claude, Gemini, OpenRouter
- **Content Length**: Works best with substantial content

### Context Menu Features

#### Available Options
- **Save to Incrementum**: Save current page
- **Save page with content**: Save with full HTML content
- **Create Extract**: Extract selected text (when text is selected)
- **Toggle Extract Mode**: Enable/disable extract mode
- **Generate Summary**: Create AI summary of page

#### Usage Tips
- **Select text first** to see extract-specific options
- **Right-click anywhere** for general page options
- **Context-aware**: Menu adapts based on current state

## 🔧 Management Interface

### Accessing Management
1. **Open Incrementum** main application
2. **Navigate** to Browser Sync tab
3. **View synced items** in the management interface

### Management Features

#### Item Filtering
- **Type Filter**: Filter by tab, bookmark, page, extract, summary
- **Status Filter**: Show pending, processed, or all items
- **Search**: Find specific items quickly

#### Item Selection
- **Individual Selection**: Check boxes next to specific items
- **Select All**: Use "Select All" checkbox for bulk operations
- **Selection Counter**: See how many items are selected

#### Bulk Operations
- **Delete Selected**: Remove chosen items permanently
- **Clear Processed**: Remove items that have been processed into documents
- **Clear All**: Remove all browser sync data (with confirmation)

#### Statistics
- **Pending Items**: Count of unprocessed items
- **Processed Items**: Count of items converted to documents
- **Extracts**: Count of text extracts
- **Real-time Updates**: Statistics update automatically

## 🧪 Testing

### Test Page
Use the included `test.html` file to verify all functionality:

1. **Open test page**: Load `browser_extension/test.html` in your browser
2. **Follow instructions**: Complete each testing section
3. **Verify features**: Check that all features work as expected

### Testing Checklist

#### Basic Functionality
- [ ] Extension loads without errors
- [ ] Connection status shows "Connected"
- [ ] Save current tab works
- [ ] Save all tabs works
- [ ] Context menu appears on right-click

#### Extract Mode
- [ ] Extract mode can be toggled on/off
- [ ] Visual indicator appears when active
- [ ] Text selection creates extracts
- [ ] Extracts appear in Incrementum
- [ ] Highlights are visible and persistent

#### AI Features
- [ ] AI summary generation works
- [ ] Summaries are saved to Incrementum
- [ ] API key is detected automatically
- [ ] Error handling for missing API keys

#### Management
- [ ] Items appear in Browser Sync view
- [ ] Filtering works correctly
- [ ] Selection and deletion work
- [ ] Clear functions work with confirmation
- [ ] Statistics are accurate

#### Keyboard Shortcuts
- [ ] `Ctrl+Shift+S` saves current tab
- [ ] `Ctrl+Shift+A` saves all tabs
- [ ] `Ctrl+Shift+E` toggles extract mode
- [ ] `Ctrl+Shift+X` creates quick extract
- [ ] `Ctrl+Shift+H` toggles highlights

## 🔍 Troubleshooting

### Connection Issues

#### "Disconnected" Status
1. **Check Incrementum**: Ensure main application is running
2. **Browser Sync**: Verify browser sync is enabled in Incrementum settings
3. **Port Configuration**: Check that port 8766 is not blocked
4. **Restart Extension**: Disable and re-enable the extension

#### "Connecting..." Status
1. **Wait**: Initial connection may take a few seconds
2. **Refresh**: Reload the extension popup
3. **Check Network**: Ensure no firewall blocking localhost connections

### Feature Issues

#### Extract Mode Not Working
1. **Visual Indicator**: Check for page border color change
2. **Text Selection**: Ensure you're selecting text, not just clicking
3. **Permissions**: Verify extension has necessary permissions
4. **Page Compatibility**: Some pages may block content scripts

#### AI Summaries Failing
1. **API Key**: Verify API key is configured in Incrementum
2. **Provider**: Check that the AI provider is supported
3. **Content Length**: Ensure page has sufficient content
4. **Rate Limits**: Check if API rate limits are exceeded

#### Highlights Not Persisting
1. **Storage Permissions**: Verify extension has storage permissions
2. **Incognito Mode**: Highlights may not persist in private browsing
3. **Clear Data**: Check if browser data was cleared

### Performance Issues

#### Slow Saving
1. **Content Size**: Large pages take longer to process
2. **Network**: Check internet connection speed
3. **Incrementum Load**: High system load may slow processing

#### Memory Usage
1. **Tab Count**: Many open tabs increase memory usage
2. **Highlight Storage**: Extensive highlights use more memory
3. **Extension Restart**: Restart extension if memory usage is high

## 🔒 Privacy & Security

### Data Handling
- **Local Processing**: Most processing happens locally
- **Secure Connection**: Uses localhost connection to Incrementum
- **No External Servers**: Data doesn't leave your system (except for AI APIs)

### Permissions
- **Active Tab**: Required to read current page content
- **All URLs**: Needed for content script injection
- **Storage**: For saving highlights and settings
- **Context Menus**: For right-click menu integration

### AI Privacy
- **API Usage**: AI summaries use configured API providers
- **Data Transmission**: Page content sent to AI providers for summaries
- **User Control**: AI features are optional and user-initiated

## 🛠️ Development

### File Structure
```
browser_extension/
├── manifest.json          # Extension manifest
├── popup.html             # Extension popup interface
├── popup.js              # Popup functionality
├── background.js         # Background script
├── content.js            # Content script for web pages
├── test.html             # Testing page
└── README.md             # This documentation
```

### Key Components

#### Popup Interface (`popup.js`)
- Connection status management
- Button event handlers
- Extract mode controls
- Statistics display
- Modal interfaces

#### Background Script (`background.js`)
- API communication with Incrementum
- Context menu management
- Tab and bookmark handling
- AI summary generation
- Message routing

#### Content Script (`content.js`)
- Extract mode implementation
- Text selection handling
- Highlighting system
- Keyboard shortcuts
- Visual indicators

### API Endpoints
The extension communicates with the BrowserSyncServer which provides:

- `POST /` - Save browser data (pages, extracts, etc.) - **Primary endpoint**
- **Connection testing**: Uses POST requests with test data since server only handles POST

**Important**: The BrowserSyncServer only handles POST requests to the root endpoint (`/`). It does not provide REST-style API endpoints like `/api/content` or `/health`.

## 📝 Changelog

### Version 2.1.0 (Latest)
- 🐛 **FIXED**: "Failed to fetch" error - Updated API endpoint from root to `/api/content`
- ✨ **NEW**: Complete settings UI redesign with modern interface
- ✨ **NEW**: Real-time connection testing with live status updates
- ✨ **NEW**: Auto-save functionality for settings changes
- ✨ **NEW**: Input validation for server URL and port
- ✨ **NEW**: Keyboard shortcuts for settings (Ctrl+S to save, Esc to close notifications)
- ✨ **NEW**: Responsive design for mobile-friendly settings
- ✨ **ENHANCED**: Better error messages and user feedback
- ✨ **ENHANCED**: All keyboard shortcuts now properly implemented
- ✨ **ENHANCED**: Improved popup UI with better visual feedback
- 🔧 **FIXED**: CSS inconsistencies between popup.html and popup.css
- 🔧 **FIXED**: Missing message handlers in background script
- 🔧 **FIXED**: Context menu integration issues

### Version 2.0.0
- ✨ Added extract mode with visual indicators
- ✨ Implemented highlighting system
- ✨ Added AI-powered summary generation
- ✨ Enhanced management interface with bulk operations
- ✨ Added comprehensive keyboard shortcuts
- ✨ Improved context menu integration
- 🔧 Enhanced error handling and user feedback
- 🔧 Added statistics and monitoring
- 🔧 Improved UI/UX with modern design

### Version 1.0.0
- 🎉 Initial release
- ✨ Basic page saving functionality
- ✨ Tab and bookmark synchronization
- ✨ Simple popup interface

## 🤝 Contributing

### Bug Reports
1. **Check existing issues** before creating new ones
2. **Provide details**: Browser version, Incrementum version, steps to reproduce
3. **Include logs**: Check browser console for errors

### Feature Requests
1. **Describe use case**: Explain why the feature would be useful
2. **Provide examples**: Show how the feature would work
3. **Consider alternatives**: Suggest different approaches

### Development Setup
1. **Clone repository**: Get the latest code
2. **Load extension**: Use Chrome developer mode
3. **Test changes**: Use the test page for verification
4. **Submit PR**: Include description of changes

## 📄 License

This project is part of the Incrementum knowledge management system. See the main project license for details.

## 🆘 Support

### Getting Help
1. **Documentation**: Check this README first
2. **Test Page**: Use `test.html` to verify functionality
3. **Issues**: Create GitHub issue for bugs or questions
4. **Community**: Join discussions in project forums

### Common Solutions
- **Connection problems**: Restart Incrementum and extension
- **Permission issues**: Check Chrome extension permissions
- **Feature not working**: Verify prerequisites are met
- **Performance issues**: Restart browser or reduce tab count

---

**Happy knowledge capturing! 🧠✨** 
