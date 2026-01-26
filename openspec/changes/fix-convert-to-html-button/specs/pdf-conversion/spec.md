# PDF Conversion Capability

## MODIFIED Requirements

### Requirement: PDF to HTML conversion parameter naming

The frontend API wrapper SHALL use parameter names that match the Tauri backend command's expected parameter names (snake_case) to ensure proper command invocation.

#### Scenario: User clicks Convert to HTML button in PDF viewer

**Given** a user is viewing a PDF document in the desktop app

**When** the user clicks the "Convert to HTML" button in the toolbar

**Then** the conversion should execute successfully with proper parameter passing

**And** a success toast notification should be displayed

**And** the HTML file should be saved alongside the original PDF

#### Scenario: Parameter names match between frontend and backend

**Given** the Tauri command `convert_document_pdf_to_html` expects parameters `id`, `save_to_file`, and `output_path` (snake_case)

**When** the frontend invokes this command via `invokeCommand()`

**Then** the parameter names in the invocation must match exactly: `id`, `save_to_file`, `output_path`

**And** camelCase parameter names like `saveToFile` and `outputPath` must not be used
