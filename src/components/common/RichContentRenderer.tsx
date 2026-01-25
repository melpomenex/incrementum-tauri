/**
 * RichContentRenderer - Safely renders rich HTML content with 1:1 visual fidelity
 *
 * Uses sandboxed iframe for HTML content to:
 * - Preserve original CSS styling and layout
 * - Prevent XSS attacks via sandbox restrictions
 * - Isolate content from the parent document
 */

import { useRef, useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";

interface RichContentRendererProps {
  /** Plain text content (required for fallback and accessibility) */
  content: string;
  /** Rich HTML content with inline styles for visual fidelity */
  htmlContent?: string;
  /** Source URL of the content (for attribution) */
  sourceUrl?: string;
  /** Whether to show the full HTML or just text preview */
  mode?: "full" | "preview" | "text-only";
  /** Maximum height for the content container */
  maxHeight?: string;
  /** Custom className for the container */
  className?: string;
  /** Whether the content is expanded */
  expanded?: boolean;
}

/**
 * Sanitizes HTML content by removing potentially dangerous elements
 * while preserving styling for visual fidelity
 */
function sanitizeHtml(html: string): string {
  // Create a temporary container
  const container = document.createElement("div");
  container.innerHTML = html;

  // Remove script tags and their content
  const scripts = container.querySelectorAll("script");
  scripts.forEach((script) => script.remove());

  // Remove event handlers from all elements
  const allElements = container.querySelectorAll("*");
  allElements.forEach((element) => {
    // Remove all event handler attributes (on*)
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) {
        element.removeAttribute(attr.name);
      }
    });

    // Remove javascript: URLs
    if (element instanceof HTMLAnchorElement && element.href?.startsWith("javascript:")) {
      element.removeAttribute("href");
    }
    if (element instanceof HTMLElement && element.style.backgroundImage?.includes("javascript:")) {
      element.style.backgroundImage = "";
    }
  });

  // Remove iframes (potential for embedding malicious content)
  const iframes = container.querySelectorAll("iframe");
  iframes.forEach((iframe) => iframe.remove());

  // Remove object, embed, and applet tags
  const embeds = container.querySelectorAll("object, embed, applet");
  embeds.forEach((embed) => embed.remove());

  // Remove form elements that could be used for phishing
  const forms = container.querySelectorAll("form");
  forms.forEach((form) => form.remove());

  // Remove base tags that could redirect URLs
  const bases = container.querySelectorAll("base");
  bases.forEach((base) => base.remove());

  return container.innerHTML;
}

/**
 * Creates an HTML document for the iframe with proper styling
 */
function createIframeDocument(htmlContent: string): string {
  const sanitized = sanitizeHtml(htmlContent);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset and base styles */
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: transparent;
    }
    body {
      padding: 8px;
    }
    /* Ensure images are responsive */
    img {
      max-width: 100%;
      height: auto;
    }
    /* Make links visible but non-functional in sandbox */
    a {
      color: #0066cc;
      text-decoration: underline;
      cursor: pointer;
    }
    /* Preserve code styling */
    pre, code {
      font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    pre {
      padding: 12px;
      overflow-x: auto;
    }
    code {
      padding: 2px 4px;
    }
    /* Table styling */
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
    }
    /* List styling */
    ul, ol {
      padding-left: 24px;
    }
    /* Blockquote styling */
    blockquote {
      border-left: 4px solid #0066cc;
      margin-left: 0;
      padding-left: 16px;
      color: #555;
    }
  </style>
</head>
<body>
  ${sanitized}
</body>
</html>
`;
}

export function RichContentRenderer({
  content,
  htmlContent,
  sourceUrl,
  mode = "full",
  maxHeight = "400px",
  className = "",
  expanded = true,
}: RichContentRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  // If no HTML content or text-only mode, render plain text
  if (!htmlContent || mode === "text-only") {
    return (
      <div className={`text-sm text-foreground leading-relaxed ${className}`}>
        {mode === "preview" ? (
          <p className="line-clamp-3">{content}</p>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            View source
          </a>
        )}
      </div>
    );
  }

  // For preview mode, show text preview with an indication that rich content is available
  if (mode === "preview") {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <FileText className="w-3 h-3" />
          <span>Rich content available</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{content}</p>
      </div>
    );
  }

  // Full mode: render in sandboxed iframe
  const handleIframeLoad = () => {
    setIsLoading(false);
    if (iframeRef.current?.contentWindow?.document?.body) {
      const body = iframeRef.current.contentWindow.document.body;
      const height = body.scrollHeight;
      setIframeHeight(Math.min(height, parseInt(maxHeight)));
    }
  };

  useEffect(() => {
    if (iframeRef.current && expanded) {
      const doc = createIframeDocument(htmlContent);
      const blob = new Blob([doc], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [htmlContent, expanded]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Rich content"
        className="w-full border-0 rounded-lg bg-white"
        style={{ height: `${iframeHeight}px`, maxHeight }}
        sandbox="allow-same-origin"
        onLoad={handleIframeLoad}
      />
      {sourceUrl && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View original source
          </a>
        </div>
      )}
    </div>
  );
}

export default RichContentRenderer;
