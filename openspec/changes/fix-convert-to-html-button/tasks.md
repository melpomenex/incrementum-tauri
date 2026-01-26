# Tasks: Fix Convert to HTML Button

## 1. Fix parameter naming in `convertPdfToHtml()` API function
- Update the Tauri mode invocation in `src/api/documents.ts`
- Change `saveToFile` to `save_to_file`
- Change `outputPath` to `output_path`
- Ensure the browser mode parameters remain unchanged (they already use correct snake_case)

## 2. Fix parameter naming in `convertDocumentPdfToHtml()` API function
- Update the Tauri mode invocation in `src/api/documents.ts`
- Change `saveToFile` to `save_to_file`
- Change `outputPath` to `output_path`
- Ensure the browser mode parameters remain unchanged (they already use correct snake_case)

## 3. Test the fix
- Build and run the Tauri application
- Open a PDF document
- Click the "Convert to HTML" button (FileCode icon)
- Verify that:
  - The conversion executes successfully
  - A success toast is displayed
  - The HTML file is saved alongside the PDF
  - The button shows loading state during conversion

## Dependencies

None - this is a standalone fix.

## Parallelizable

Tasks 1 and 2 can be done together (they are in the same file and follow the same pattern).
