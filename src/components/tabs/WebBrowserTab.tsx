import { useState, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

export function WebBrowserTab() {
  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleNavigate = async (inputUrl: string) => {
    if (!inputUrl.trim()) return;

    // Add protocol if missing
    let formattedUrl = inputUrl;
    if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
      formattedUrl = `https://${inputUrl}`;
    }

    setIsLoading(true);
    setCurrentUrl(formattedUrl);
    setUrl(formattedUrl);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(formattedUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setIsLoading(false);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setUrl(url);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setUrl(url);
    }
  };

  const handleRefresh = () => {
    if (currentUrl) {
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    }
  };

  const handleOpenInBrowser = async () => {
    if (currentUrl) {
      try {
        await openUrl(currentUrl);
      } catch (error) {
        console.error("Error opening URL:", error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Browser Toolbar */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Navigation Buttons */}
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Back"
          >
            ←
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Forward"
          >
            →
          </button>
          <button
            onClick={handleRefresh}
            disabled={!currentUrl}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh"
          >
            ↻
          </button>

          {/* URL Input */}
          <div className="flex-1 flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleNavigate(url)}
              placeholder="Enter URL or search..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <button
              onClick={() => handleNavigate(url)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go
            </button>
            <button
              onClick={handleOpenInBrowser}
              disabled={!currentUrl}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              title="Open in system browser"
            >
              Open Externally
            </button>
          </div>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}

        {!currentUrl ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🌐</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Web Browser
              </h2>
              <p className="text-muted-foreground mb-4">
                Enter a URL above to browse the web. You can also open links
                directly in your system browser.
              </p>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-2">Tips:</p>
                <ul className="text-left space-y-1">
                  <li>• Press Enter to navigate</li>
                  <li>• Use arrow keys to navigate history</li>
                  <li>• Open pages in external browser for full functionality</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full h-full border-0"
            title="Web Browser"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
      </div>
    </div>
  );
}
