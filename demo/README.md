# Demo Content

This directory contains sample content that is automatically imported when a new user launches the application with an empty database.

## Directory Structure

```
demo/
├── apkg/           # Sample Anki deck files (.apkg)
└── books/          # Sample ebook files (.epub, .pdf)
```

## Adding Demo Content

1. **Anki Decks (.apkg)**: Place .apkg files in the `apkg/` subdirectory.
   - These will be automatically imported as learning items
   - Users can try the flashcard system immediately

2. **Ebooks (.epub, .pdf)**: Place ebook files in the `books/` subdirectory.
   - These will be automatically added to the document library
   - Users can try reading and highlighting features

## Environment Variables

- `DEMO_CONTENT_DIR`: Override the default demo content directory path
- `SKIP_DEMO_IMPORT`: Set to `1` to disable demo content auto-import

## Notes

- Demo content is only imported on first run when the database is empty
- Users can re-import demo content from settings
- Users can remove demo content from settings at any time
