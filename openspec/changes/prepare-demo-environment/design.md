## Context

This change encompasses three separate but related improvements to prepare the application for demo/web deployment. Each has different technical considerations but together they improve the first-run experience for new users.

### Current State Analysis

**Theme System:**
- Default theme is `modern-dark` in `src/config/defaultSettings.ts:18`
- `milky-matcha` is defined in `src/themes/builtin.ts` as a light theme with green accents
- Theme selection is stored per-user in settings, so changing default only affects new installations

**APKG Import:**
- Import functions in `src-tauri/src/anki.rs`:
  - `import_anki_package_to_learning_items` (lines 385-417)
  - `import_anki_package_bytes_to_learning_items` (lines 420-452)
- Current code iterates through `deck.cards` and creates learning items per card
- Has duplicate prevention via `imported_note_guids` HashSet
- Returns `Vec<LearningItem>` which determines the count shown to user

**Demo Content:**
- No existing demo content system
- Database starts empty (see `src-tauri/migrations/001_initial.sql`)
- No first-run wizard or sample data

### Stakeholders

- **New web users** - Primary audience for demo functionality
- **Desktop users** - Benefit from theme change and optional demo content
- **Existing users** - Not affected by theme change (have saved preferences)

## Goals / Non-Goals

**Goals:**
1. Set milky-matcha as the default theme for all new installations
2. Fix APKG import to report accurate count of imported items
3. Provide demo content that can be tried immediately on web deployment

**Non-Goals:**
1. Changing theme for existing users
2. Modifying the APKG import logic itself (only fixing the count/reporting)
3. Full demo content management system (basic auto-import only)
4. User-generated demo content sharing

## Decisions

### Decision 1: Milky-Matcha as Default Theme

**What:** Change `interface.theme` default from `'modern-dark'` to `'milky-matcha'`.

**Why:** Milky-matcha is a well-designed light theme that presents better for demos and screenshots. Light themes are generally more approachable for new users.

**Implementation:**
- Single-line change in `src/config/defaultSettings.ts`
- No migration needed (only affects new installs)

### Decision 2: APKG Count Shows Unique Learning Items

**What:** The import count should reflect the number of unique learning items created, not the total cards processed.

**Why:** Users care about how many new items they can review, not the internal Anki card structure. The current `imported_note_guids` set already tracks unique notes.

**Root Cause Analysis:**

The 4-5x issue likely occurs because:
1. Anki notes can have multiple card types (e.g., forward, reverse, cloze variants)
2. The current code creates a learning item for each card found
3. However, the duplicate prevention `if !imported_note_guids.insert(note.guid.clone()) { continue; }` should prevent duplicates

**Possible actual causes:**
- The `build_learning_item` function may be called multiple times per note despite the GUID check
- Multiple decks in one .apkg file might reference the same notes
- The counting might happen before the duplicate filter in the display layer

**Implementation:**
- The HashSet approach already prevents actual duplicates in the database
- The reported count from `created_items.len()` should be accurate
- Need to investigate if the issue is in counting or actual item creation
- Add logging to verify the import process

### Decision 3: Demo Content Directory with Auto-Import

**What:** Create a `demo/` directory for sample content that auto-imports on empty database.

**Why:** New users need something to try immediately without preparing their own content.

**Directory Structure:**
```
demo/
  ├── apkg/
  │   ├── basics.apkg          # Sample flashcards
  │   └── programming.apkg     # Programming flashcards
  └── books/
      ├── sample.epub          # Sample ebook
      └── tutorial.pdf         # Tutorial PDF
```

**Implementation:**
- Check for demo directory on startup
- Only import if database has no learning items
- Add setting to skip or re-import demo content
- For web deployment, demo content can be bundled or fetched from URL

## Risks / Trade-offs

### Risk 1: Theme Preference Subjectivity

**Risk:** Users may prefer dark themes or have different aesthetic preferences.

**Mitigation:**
- Theme is easily changeable in settings
- Only affects new users who haven't formed a preference yet
- Milky-matcha is objectively well-designed with good contrast

### Risk 2: APKG Counting Issue May Be Elsewhere

**Risk:** The 4-5x issue might be in the frontend display rather than backend import.

**Mitigation:**
- Add logging to both backend and frontend
- Verify the actual database count after import
- Check if the issue is in `ImportExportSettings.tsx` count display

### Risk 3: Demo Content Bloat

**Risk:** Including demo content increases application size.

**Mitigation:**
- Keep demo content minimal (1-2 MB total)
- Make demo content optional via environment variable
- For web, load demo content from external URL on demand

## Migration Plan

### Phase 1: Theme Default Change
1. Update `src/config/defaultSettings.ts`
2. Test new installations see milky-matcha
3. Verify existing users keep their saved theme

### Phase 2: APKG Import Investigation
1. Add debug logging to `import_anki_package_to_learning_items`
2. Import a test .apkg with known card/note counts
3. Verify actual database count vs reported count
4. Fix the root cause (counting or actual duplication)

### Phase 3: Demo Content System
1. Create `demo/` directory structure
2. Add `check_and_import_demo_content()` function
3. Call on startup if database is empty
4. Add setting to control demo content behavior

### Rollback Strategy
- Theme change: Single-line revert
- APKG fix: Revert to original import function
- Demo content: Add `SKIP_DEMO_IMPORT=1` environment variable
