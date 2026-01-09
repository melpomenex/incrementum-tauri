# Settings Management Specification

## ADDED Requirements

### Requirement: Comprehensive Settings Framework
The application MUST provide a robust settings management system supporting 20+ categories with validation, persistence, and import/export capabilities.

#### Scenario: Navigate settings categories
**Given** the user opens the settings dialog
**When** the settings dialog displays
**Then** it should show all available settings categories in a sidebar
**And** display the currently selected category's settings
**And** allow quick switching between categories

#### Scenario: Modify setting value
**Given** the user is viewing any settings category
**When** they change a setting value
**Then** the setting should be validated against the schema
**And** if valid, apply the change immediately
**And** persist to storage
**And** emit events for dependent systems

#### Scenario: Reset to defaults
**Given** the user is viewing any settings category
**When** they click "Reset to Defaults"
**Then** all settings in that category should revert to default values
**And** changes should be confirmed with the user
**And** dependent systems should be notified

### Requirement: General Settings
The application MUST provide general application settings.

#### Scenario: Configure auto-save interval
**Given** the user is on the General settings tab
**When** they set the auto-save interval to N minutes
**Then** the application should auto-save all work every N minutes
**And** show a countdown in the status bar
**And** persist the interval preference

#### Scenario: Configure recent documents
**Given** the user is on the General settings tab
**When** they set the maximum recent documents to N
**Then** the application should keep only the N most recent documents
**And** update the recent documents menu accordingly

#### Scenario: Toggle statistics on startup
**Given** the user is on the General settings tab
**When** they enable "Show statistics on startup"
**Then** the application should display the statistics dashboard on launch
**And** respect the preference on subsequent starts

#### Scenario: Configure session restore
**Given** the user is on the General settings tab
**When** they enable "Restore open tabs on startup"
**Then** the application should save the current tab state on close
**And** restore all tabs on next launch
**And** restore the scroll position and content of each tab

### Requirement: Interface Settings
The application MUST provide interface customization settings.

#### Scenario: Select theme
**Given** the user is on the Interface settings tab
**When** they select a theme from the dropdown
**Then** the theme should be applied immediately
**And** persist the selection
**And** update the UI to reflect the new theme

#### Scenario: Enable dense mode
**Given** the user is on the Interface settings tab
**When** they enable "Dense Mode"
**Then** the UI should reduce spacing and padding throughout
**And** use smaller font sizes where appropriate
**And** increase information density

#### Scenario: Configure toolbar icon size
**Given** the user is on the Interface settings tab
**When** they set the toolbar icon size to N pixels
**Then** all toolbar icons should resize to N pixels
**And** the toolbar should adjust its layout accordingly

### Requirement: Document Settings
The application MUST provide document processing and viewing settings.

#### Scenario: Configure auto-segmentation
**Given** the user is on the Documents settings tab
**When** they enable "Automatically segment long documents"
**Then** newly imported documents should be segmented automatically
**And** use the configured segment size and strategy

#### Scenario: Configure OCR provider
**Given** the user is on the Documents settings tab
**When** they select an OCR provider and enter API key
**Then** PDF imports should use that provider for OCR
**And** the API key should be stored securely
**And** OCR should be enabled for PDF imports

#### Scenario: Configure math OCR
**Given** the user is on the Documents settings tab
**When** they configure local math OCR settings
**Then** mathematical content in PDFs should be OCR'd
**And** the OCR'd content should be available for Q&A
**And** local models should be used if configured

### Requirement: Learning Settings
The application MUST provide learning algorithm and queue settings.

#### Scenario: Configure retention parameters
**Given** the user is on the Learning settings tab
**When** they set the desired retention rate
**Then** the scheduling algorithm should target that retention rate
**And** adjust intervals accordingly

#### Scenario: Enable interleaved queue mode
**Given** the user is on the Learning settings tab
**When** they enable interleaved queue mode
**And** set the interleaved ratio to N%
**Then** N% of cards should come from new cards
**And** the remainder should come from review cards

#### Scenario: Configure SMART priority scoring
**Given** the user is on the Learning settings tab
**When** they enable SMART priority scoring
**And** configure learning style and weights
**Then** the queue should prioritize cards based on the configured model
**And** use ML predictions if enabled

### Requirement: Algorithm Settings
The application MUST provide algorithm selection and parameter tuning.

#### Scenario: Select algorithm
**Given** the user is on the Algorithm settings tab
**When** they select FSRS, SM2, or SuperMemo
**Then** that algorithm should be used for all scheduling
**And** algorithm-specific parameters should be displayed
**And** card scheduling should update immediately

#### Scenario: Configure FSRS parameters
**Given** the user has selected FSRS algorithm
**When** they adjust desired retention or weights
**Then** the algorithm should use those parameters
**And** update future scheduling calculations

#### Scenario: Configure forgetting index
**Given** the user is using SuperMemo algorithm
**When** they set the global forgetting index
**Then** the algorithm should use that index for all items
**And** allow category-specific overrides

### Requirement: Automation Settings
The application MUST provide automation and notification settings.

#### Scenario: Enable auto-sync
**Given** the user is on the Automation settings tab
**When** they enable auto-sync
**And** set the sync interval
**Then** the application should sync automatically every N minutes
**And** show sync status in the status bar

#### Scenario: Configure desktop notifications
**Given** the user is on the Automation settings tab
**When** they enable desktop notifications
**And** set the notification interval
**Then** the application should show notifications for due reviews
**And** respect the system's notification settings

### Requirement: API Settings
The application MUST provide API configuration for external services.

#### Scenario: Configure QA provider
**Given** the user is on the API settings tab
**When** they select a QA provider (OpenAI, Anthropic, etc.)
**And** enter API key and endpoint
**Then** the QA feature should use that provider
**And** the API key should be stored securely

#### Scenario: Configure local LLM
**Given** the user is on the API settings tab
**When** they enable local LLM
**And** set the endpoint and model
**Then** the application should use the local LLM for AI features
**And** respect the configured endpoint

#### Scenario: Configure transcription service
**Given** the user is on the API settings tab
**When** they configure a transcription provider
**And** enter API credentials
**Then** audio transcription should use that provider
**And** store credentials securely

### Requirement: QA Settings
The application MUST provide question-answering feature settings.

#### Scenario: Enable auto QA generation
**Given** the user is on the QA settings tab
**When** they enable "Auto-generate questions"
**And** set the maximum questions per extract
**Then** the system should automatically generate questions from extracts
**And** respect the maximum limit

#### Scenario: Configure QA difficulty
**Given** the user is on the QA settings tab
**When** they select a difficulty level
**Then** generated questions should match that difficulty
**And** adjust question complexity accordingly

#### Scenario: Set QA system prompt
**Given** the user is on the QA settings tab
**When** they customize the QA system prompt
**Then** that prompt should be used for all QA requests
**And** allow default templates

#### Scenario: Configure context window
**Given** the user is on the QA settings tab
**When** they enable context window
**And** set the window size
**Then** QA should include N surrounding words in context
**And** improve answer relevance

### Requirement: Integration Settings
The application MUST provide settings for third-party integrations.

#### Scenario: Configure Anki integration
**Given** the user is on the Integrations settings tab
**When** they enable Anki integration
**And** set the deck name and sync options
**Then** cards should sync to the configured Anki deck
**And** support bidirectional sync if enabled

#### Scenario: Configure Obsidian integration
**Given** the user is on the Integrations settings tab
**When** they set the Obsidian vault path
**And** configure the note template
**Then** extracts should sync to the vault
**And** use the configured template
**And** support daily notes if enabled

### Requirement: MCP Servers Settings
The application MUST support configuration of up to 3 MCP servers.

#### Scenario: Configure MCP server
**Given** the user is on the MCP Servers settings tab
**When** they enter server name, endpoint, and transport
**Then** the application should connect to the MCP server
**And** use it for AI features
**And** handle connection errors gracefully

#### Scenario: Enable auto-connect to MCP
**Given** the user has configured MCP servers
**When** they enable "Auto-connect on startup"
**Then** the application should connect to all MCP servers on launch
**And** show connection status

### Requirement: Keybindings Settings
The application MUST provide comprehensive keyboard shortcut customization.

#### Scenario: View all keybindings
**Given** the user is on the Keybindings settings tab
**When** the tab loads
**Then** it should display all available commands and their bindings
**And** group by functionality
**And** allow searching and filtering

#### Scenario: Customize keybinding
**Given** the user is on the Keybindings settings tab
**When** they click a keybinding field and press a key combination
**Then** the new binding should be validated
**And** check for conflicts
**And** apply the change if valid

#### Scenario: Reset keybinding to default
**Given** the user has customized a keybinding
**When** they click "Reset to Default" for that binding
**Then** the binding should revert to its default value
**And** persist the change

### Requirement: RSS Settings
The application MUST provide RSS feed management settings.

#### Scenario: Configure RSS polling
**Given** the user is on the RSS settings tab
**When** they set the check frequency and app interval
**Then** the application should poll feeds at the configured interval
**And** queue new articles according to settings

#### Scenario: Configure RSS auto-cleanup
**Given** the user is on the RSS settings tab
**When** they enable auto-cleanup
**And** set the keep entries limit
**Then** old RSS entries should be automatically cleaned up
**And** maintain only the most recent N entries

### Requirement: SponsorBlock Settings
The application MUST provide SponsorBlock integration settings.

#### Scenario: Enable SponsorBlock
**Given** the user is on the SponsorBlock settings tab
**When** they enable SponsorBlock
**And** select which categories to skip
**Then** YouTube videos should auto-skip sponsored segments
**And** respect the category selection

#### Scenario: Configure SponsorBlock privacy
**Given** the user is on the SponsorBlock settings tab
**When** they enable privacy mode
**Then** SponsorBlock should not submit view data
**And** only use existing skip data

### Requirement: Sync Settings
The application MUST provide synchronization settings for browser, cloud, and desktop sync.

#### Scenario: Enable browser sync
**Given** the user is on the Sync settings tab
**When** they enable browser sync
**And** set the port
**Then** the browser extension should be able to sync
**And** the sync server should listen on the configured port

#### Scenario: Configure VPS cloud sync
**Given** the user is on the Sync settings tab
**When** they enter VPS URL and API key
**And** enable polling on startup
**Then** the application should sync highlights to the VPS
**And** poll for new highlights on startup

#### Scenario: Enable desktop full sync
**Given** the user is on the Sync settings tab
**When** they enable desktop full sync
**And** configure sync interval
**Then** the application should perform full sync at the interval
**And** sync on startup if enabled

### Requirement: Settings Import/Export
The application MUST support importing and exporting settings.

#### Scenario: Export settings
**Given** the user has configured settings
**When** they click "Export Settings"
**Then** the application should generate a JSON file with all settings
**And** exclude sensitive data (API keys should be encrypted)
**And** save to the user's selected location

#### Scenario: Import settings
**Given** the user has a settings JSON file
**When** they click "Import Settings" and select the file
**Then** the application should validate the settings
**And** merge with existing settings
**And** apply the imported settings

## Implementation Notes

### Settings Validation Schema
- Use Zod for runtime validation
- Provide clear error messages for invalid values
- Sanitize all user inputs before storage

### Secure Storage
- API keys stored in Tauri's secure store (keychain)
- Settings file should contain references, not actual keys
- Encrypt sensitive settings at rest

### Settings Events
```typescript
// Emit events when settings change
'general:autoSaveInterval:changed'
'interface:theme:changed'
'documents:ocr:provider:changed'
// etc.
```

### Performance
- Debounce rapid setting changes (e.g., sliders)
- Batch settings writes to storage
- Lazy load expensive settings computations
