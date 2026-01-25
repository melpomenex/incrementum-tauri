# Design: Fix Web Article Import

## Architecture Overview

The web article import feature integrates three existing layers:

1. **UI Layer**: `EnhancedFilePicker` component (already implemented)
2. **Business Logic Layer**: `importFromUrl` and `importFromArxiv` utilities (already implemented)
3. **Data Layer**: Document store and API layer (needs enhancement)

The implementation connects these layers by:
- Adding UI entry points to trigger URL imports
- Extending the store with URL/Arxiv import methods
- Fixing browser-mode CORS limitations

## Component Integration

### Documents View Integration
The `EnhancedFilePicker` component will be added to both:
- `src/routes/documents.tsx` - Simple view
- `src/components/documents/DocumentsView.tsx` - Advanced view with filters

**Integration Pattern**:
```typescript
const [showImportPicker, setShowImportPicker] = useState(false);
const [initialImportSource, setInitialImportSource] = useState<'local' | 'url' | 'arxiv'>('local');

const handleImportFromUrl = () => {
  setInitialImportSource('url');
  setShowImportPicker(true);
};

const handleImportFromArxiv = () => {
  setInitialImportSource('arxiv');
  setShowImportPicker(true);
};

const handleImport = async (source: ImportSource, data: any) => {
  try {
    if (source === 'url') {
      await importFromUrl(data.url);
    } else if (source === 'arxiv') {
      await importFromArxiv(data.url);
    } else if (source === 'local') {
      await importFromFiles(data.filePaths);
    }
    setShowImportPicker(false);
  } catch (error) {
    // Error handled by store
  }
};
```

## Store Layer Design

### New Methods

**`importFromUrl(url: string): Promise<Document>`**
```typescript
importFromUrl: async (url) => {
  set({ isImporting: true, error: null });

  try {
    // Use existing utility to fetch and create document
    const docData = await importFromUrl(url);

    // Create document in backend
    const doc = await documentsApi.createDocument(
      docData.title,
      docData.filePath,
      docData.fileType
    );

    // Add to state
    set((state) => ({
      documents: [...state.documents, doc],
      isImporting: false
    }));

    return doc;
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Failed to import from URL',
      isImporting: false
    });
    throw error;
  }
}
```

**`importFromArxiv(arxivIdOrUrl: string): Promise<Document>`**
```typescript
importFromArxiv: async (arxivIdOrUrl) => {
  set({ isImporting: true, error: null });

  try {
    // Use existing utility to fetch from Arxiv
    const docData = await importFromArxiv(arxivIdOrUrl);

    // Create document in backend
    const doc = await documentsApi.createDocument(
      docData.title,
      docData.filePath,
      docData.fileType
    );

    // Add to state
    set((state) => ({
      documents: [...state.documents, doc],
      isImporting: false
    }));

    return doc;
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Failed to import from Arxiv',
      isImporting: false
    });
    throw error;
  }
}
```

## Browser Mode CORS Proxy Strategy

### Problem
Browser mode cannot directly fetch URLs due to CORS restrictions. The backend's `fetch_url_content` command currently throws an error in browser mode.

### Solution
Implement a CORS proxy fallback chain similar to the RSS feed implementation:

```typescript
fetch_url_content: async (args) => {
  const url = args.url as string;
  const corsProxies = [
    null, // Try direct first
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  let lastError: Error | null = null;

  for (const proxy of corsProxies) {
    try {
      const fetchUrl = proxy ? proxy + encodeURIComponent(url) : url;
      const response = await fetch(fetchUrl);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const blob = await response.blob();

        // Store in IndexedDB
        const fileId = `fetched-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const file = new File([blob], getFilenameFromUrl(url), { type: contentType });
        await db.storeFile(file, `browser-fetched://${fileId}`);

        return {
          file_path: `browser-fetched://${fileId}`,
          file_name: getFilenameFromUrl(url),
          content_type: contentType
        };
      }
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }

  throw new Error(`Failed to fetch URL. Last error: ${lastError?.message}`);
}
```

### Proxy Selection Rationale
1. **Direct fetch first**: Works for CORS-enabled resources (some APIs, CDNs)
2. **allorigins.win**: Reliable, supports many content types
3. **corsproxy.io**: No rate limiting, good backup
4. **codetabs.com**: Last resort, has some limitations

### IndexedDB Storage Pattern
Fetched content is stored in the browser file store (IndexedDB) with virtual paths:
- Pattern: `browser-fetched://[timestamp]-[random-id]`
- Enables document creation without local filesystem
- Persisted across page refreshes
- Cleaned up when document is deleted

## Error Handling Strategy

### Error Categories

**1. Validation Errors** (before fetch)
- Invalid URL format
- Invalid Arxiv ID format
- **Action**: Show inline error in input field, prevent import

**2. Network Errors** (during fetch)
- Timeout (60s)
- DNS resolution failure
- Connection refused
- **Action**: Show error dialog with retry button

**3. HTTP Errors** (from server)
- 404 Not Found
- 403 Forbidden
- 500 Server Error
- **Action**: Show clear error message with HTTP status

**4. CORS Errors** (browser mode only)
- All proxies failed
- **Action**: Show explanatory message:
  - "URL fetching in browser mode requires CORS proxies. All proxies are currently unavailable."
  - Suggest: "Try the desktop app for unrestricted URL importing."

### Error Display Pattern
```typescript
if (error) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold">Import Failed</h4>
          <p className="text-sm mt-1">{error}</p>
          {retryable && (
            <button onClick={onRetry} className="mt-2 text-sm underline">
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Loading States

### UI Feedback During Import
1. **Initial State**: Import button enabled
2. **Fetching State**:
   - Disable import button
   - Show spinner/loader
   - Display "Fetching {url}..." message
3. **Processing State**:
   - Show "Processing document..." message
4. **Complete State**:
   - Show success toast
   - Re-enable import button
   - Navigate to document or clear form

### Progress Updates
For multi-step imports (Arxiv with metadata fetch):
```typescript
setImportProgress({
  current: 1,
  total: 2,
  fileName: 'Fetching paper metadata...'
});

// After metadata fetch
setImportProgress({
  current: 2,
  total: 2,
  fileName: 'Downloading PDF...'
});
```

## File Type Detection Logic

The `importFromUrl` utility already implements detection:

```typescript
// From content-type header
if (fetched.content_type.includes('pdf')) {
  fileType = 'pdf';
} else if (fetched.content_type.includes('markdown')) {
  fileType = 'markdown';
}

// From URL extension
if (url.match(/\.(md|markdown)$/i)) {
  fileType = 'markdown';
} else if (url.match(/\.(pdf)$/i)) {
  fileType = 'pdf';
}

// Default to HTML for web pages
fileType = 'html';
```

This approach handles:
- Direct file links (.pdf, .epub, .md)
- URLs with content-type headers
- Generic web pages (default to HTML)

## Security Considerations

### URL Validation
- Only allow HTTP/HTTPS protocols
- Block localhost and private IPs (in browser mode)
- Validate URL format before fetch

### Content Sanitization
- For HTML imports, consider sanitizing (future enhancement)
- For PDFs, rely on viewer's security

### Rate Limiting
- No explicit rate limiting in MVP
- CORS proxies may have their own limits
- Consider adding delay between imports in future

## Future Enhancements (Out of Scope)

1. **Content Extraction**: Extract article content from HTML pages (using Readability.js or similar)
2. **Metadata Fetching**: Fetch OpenGraph tags, page titles, descriptions
3. **Batch Import**: Support importing multiple URLs at once
4. **URL Preview**: Show page title/favicon before importing
5. **Import History**: Track previously imported URLs to avoid duplicates
6. **Auto-Categorization**: Category suggestions based on URL domain
