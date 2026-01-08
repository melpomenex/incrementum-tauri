# File Picker Fix - Tauri 2.x Dialog Plugin

## Problem
The file picker was not working when clicking the "Import File" button in the toolbar.

## Root Cause
In Tauri 2.x, plugin permissions are configured differently than in Tauri 1.x. The dialog plugin was installed and initialized in the code, but the necessary permissions were not granted in the capabilities file.

## Solution

### 1. Updated Capabilities File
**File**: `src-tauri/capabilities/default.json`

Added dialog plugin permissions:
```json
{
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default",    // ← Added
    "dialog:open",       // ← Added
    "dialog:save"        // ← Added
  ]
}
```

### 2. Configuration Status
**File**: `src-tauri/tauri.conf.json`
- Plugin configuration: `"plugins": {}` (correct for Tauri 2.x)
- Dialog plugin is already initialized in `src-tauri/src/lib.rs`:
  ```rust
  tauri::Builder::default()
      .plugin(tauri_plugin_dialog::init())  // ← Already present
  ```

## How Tauri 2.x Plugin Permissions Work

### Incorrect (Tauri 1.x style):
```json
"plugins": {
  "dialog": {
    "scope": ["open", "save"]
  }
}
```
This causes error: `invalid type: map, expected unit`

### Correct (Tauri 2.x style):
1. Keep `plugins: {}` empty in `tauri.conf.json`
2. Add permissions in `capabilities/default.json`:
   ```json
   {
     "permissions": [
       "dialog:default",
       "dialog:open",
       "dialog:save"
     ]
   }
   ```

## Usage Instructions

### Starting the Application
```bash
npm run tauri dev
```

### Importing Documents

#### Method 1: Toolbar Button
1. Click the "Import File" button in the toolbar (FileText icon)
2. Select one or more files in the file picker
3. Files will be imported automatically

#### Method 2: Keyboard Shortcut
- Press `Ctrl+O` (Windows/Linux) or `Cmd+O` (Mac)

#### Method 3: Drag and Drop
1. Drag file(s) onto the application window
2. Visual overlay appears: "Drop Files to Import"
3. Confirm in the dialog
4. Select files in the native file picker
5. Import progress indicator shows status

## Supported File Types
- PDF (`.pdf`)
- EPUB (`.epub`)
- Markdown (`.md`, `.markdown`)
- HTML (`.html`, `.htm`)
- Text files (`.txt`)

## Verification
To verify the fix is working:
1. Start the application
2. Click the "Import File" button (first button in toolbar)
3. A native file picker dialog should appear
4. Select a file and confirm
5. The document should be imported and appear in the application

## Files Modified
- `src-tauri/capabilities/default.json` - Added dialog permissions

## Files Already Correct
- `src-tauri/src/lib.rs` - Dialog plugin initialized
- `src-tauri/Cargo.toml` - Dialog plugin dependency present
- `package.json` - `@tauri-apps/plugin-dialog` installed
- `src/api/documents.ts` - File picker API wrapper
- `src/stores/documentStore.ts` - Import state management
- `src/components/Toolbar.tsx` - Import button handler

## Status
✅ Fixed and ready for testing
