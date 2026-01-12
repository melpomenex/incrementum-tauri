/**
 * Global store for browser-selected files
 * Used to pass File objects from the UI (File API) to the backend (IndexedDB)
 * avoiding serialization overhead until necessary.
 */

// Map of virtual paths (browser-file://...) to File objects
export const browserFileStore = new Map<string, File>();

/**
 * Get a file from the browser file store
 */
export function getBrowserFile(path: string): File | undefined {
    return browserFileStore.get(path);
}

/**
 * Store a file and return its virtual path
 */
export function storeBrowserFile(file: File): string {
    const virtualPath = `browser-file://${file.name}`;
    browserFileStore.set(virtualPath, file);
    return virtualPath;
}
