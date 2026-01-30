# White Screen Troubleshooting

## Possible Causes & Solutions

### 1. Browser Cache / Service Worker
The app has service worker clearing logic that might cause issues:

**Solution:**
- Open DevTools (F12)
- Go to Application/Storage
- Click "Clear site data" or "Clear storage"
- Reload the page

Or try Incognito/Private mode.

### 2. Vite Dev Server Issues
The dev server might have stale cache.

**Solution:**
```bash
# Kill any running vite processes
pkill -f vite

# Clear vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

### 3. Check Browser Console
Open DevTools Console (F12) and look for errors like:
- "Cannot read property of undefined"
- Import errors
- Syntax errors

### 4. Build Test
Try the production build:
```bash
npm run build
npm run preview
```

If preview works but dev doesn't, it's a dev server issue.

### 5. Port Already in Use
If port 15173 is in use, the dev server might fail silently.

**Solution:**
```bash
lsof -ti:15173 | xargs kill -9
npm run dev
```

### 6. Check for Store Initialization Issues
The white screen could be caused by a Zustand store error. Check the console for:
- "Cannot read property 'X' of undefined"
- Store initialization errors

### 7. Network Issues
If using Tauri, check that the webview can access localhost:15173.

## Recent Changes (Chapter Q&A Feature)

The following files were modified/added:
- `src/utils/chapterUtils.ts` - New file
- `src/utils/__tests__/chapterUtils.test.ts` - New test file  
- `src/components/tabs/DocumentQATab.tsx` - Modified with chapter detection

If issues persist after trying above, check if reverting these helps isolate the problem.
