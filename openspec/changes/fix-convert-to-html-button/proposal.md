# Fix: Convert to HTML Button Does Nothing

## Summary

The "Convert to HTML" button in the PDF viewer toolbar does nothing when clicked. This is caused by a parameter naming mismatch between the frontend API wrapper and the Tauri backend command.

## Problem

When a user clicks the "Convert to HTML" button (FileCode icon) in the PDF viewer toolbar, the conversion fails silently or throws an error because the frontend sends parameters in camelCase (`saveToFile`, `outputPath`) while the Tauri backend expects snake_case (`save_to_file`, `output_path`).

Tauri's command system requires exact parameter name matching (case-sensitive), causing the invocation to fail or pass undefined values.

### Current State

**Frontend** (`src/api/documents.ts:303-307`):
```typescript
return await invokeCommand<PdfToHtmlResult>("convert_document_pdf_to_html", {
  id,
  saveToFile,      // camelCase - WRONG
  outputPath,      // camelCase - WRONG
});
```

**Backend** (`src-tauri/src/commands/document.rs:438-441`):
```rust
pub async fn convert_document_pdf_to_html(
    id: String,
    save_to_file: Option<bool>,    // snake_case - expects this
    output_path: Option<String>,    // snake_case - expects this
```

## Solution

Fix the parameter naming in the frontend API wrapper to match the Tauri command's expected parameter names.

## Affected Components

- `src/api/documents.ts` - Frontend API wrapper
- `src/components/viewer/DocumentViewer.tsx` - Uses the conversion API

## Changes Required

1. Update `convertPdfToHtml()` and `convertDocumentPdfToHtml()` in `src/api/documents.ts` to use snake_case parameter names for Tauri mode

## Related

- This only affects the Tauri/desktop version of the app
- The browser backend already correctly throws an error indicating the feature is unavailable in web mode
