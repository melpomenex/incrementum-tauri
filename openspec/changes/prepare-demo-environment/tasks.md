## 1. Default Theme Change

- [ ] 1.1 Update `src/config/defaultSettings.ts` to set `interface.theme: 'milky-matcha'`
- [ ] 1.2 Test new installation sees milky-matcha theme by default
- [ ] 1.3 Verify existing users keep their saved theme preference
- [ ] 1.4 Test theme switching still works correctly

## 2. APKG Import Counting Fix

- [ ] 2.1 Add debug logging to `import_anki_package_to_learning_items` to track actual import counts
- [ ] 2.2 Create test .apkg file with known number of notes/cards
- [ ] 2.3 Import test file and verify database count matches expected unique items
- [ ] 2.4 Verify the reported count in UI matches actual database count
- [ ] 2.5 If issue is in counting display, fix the count calculation
- [ ] 2.6 If issue is actual duplicates, fix the deduplication logic
- [ ] 2.7 Remove debug logging after fix is verified

## 3. Demo Content Directory Structure

- [ ] 3.1 Create `demo/` directory at project root
- [ ] 3.2 Create `demo/apkg/` subdirectory for sample .apkg files
- [ ] 3.3 Create `demo/books/` subdirectory for sample ebooks
- [ ] 3.4 Add README.md in demo/ explaining the purpose and format
- [ ] 3.5 Add at least one sample .apkg file with basic flashcards

## 4. Demo Content Auto-Import Backend

- [ ] 4.1 Create `src-tauri/src/demo.rs` module
- [ ] 4.2 Implement `check_and_import_demo_content()` function
- [ ] 4.3 Add check for empty database (no learning items exist)
- [ ] 4.4 Implement scanning of demo directory for .apkg files
- [ ] 4.5 Implement auto-import of found demo files
- [ ] 4.6 Add environment variable `DEMO_CONTENT_DIR` for custom path
- [ ] 4.7 Register demo module commands in `src-tauri/src/lib.rs`

## 5. Demo Content Integration

- [ ] 5.1 Call `check_and_import_demo_content()` on app startup
- [ ] 5.2 Add user setting `autoImportDemoContent` (default: true)
- [ ] 5.3 Add setting to re-import demo content manually
- [ ] 5.4 Add setting to skip demo content import
- [ ] 5.5 Show notification when demo content is imported
- [ ] 5.6 Handle web deployment case (demo content from URL)

## 6. Settings UI Updates

- [ ] 6.1 Add "Demo Content" section to settings page
- [ ] 6.2 Add checkbox for "Auto-import demo content on first run"
- [ ] 6.3 Add button to "Re-import demo content"
- [ ] 6.4 Add button to "Remove demo content"
- [ ] 6.5 Show current demo content status (imported/not imported)

## 7. Testing and Validation

- [ ] 7.1 Test new installation defaults to milky-matcha theme
- [ ] 7.2 Test APKG import with various file types (basic, cloze, multi-deck)
- [ ] 7.3 Verify imported count matches actual items in database
- [ ] 7.4 Test demo content auto-import on fresh installation
- [ ] 7.5 Test demo content skip with existing data
- [ ] 7.6 Test demo content re-import functionality
- [ ] 7.7 Test demo content removal functionality
- [ ] 7.8 Verify web deployment can access demo content

## 8. Documentation

- [ ] 8.1 Update README.md with demo content information
- [ ] 8.2 Document demo content directory structure
- [ ] 8.3 Document environment variables for demo configuration
- [ ] 8.4 Add changelog entry for theme default change
- [ ] 8.5 Add changelog entry for APKG import fix
- [ ] 8.6 Add changelog entry for demo content feature
