import { useState, useEffect } from "react";
import { useDocumentStore } from "../../stores";
import { Camera, Download, Trash2, Calendar, Check } from "lucide-react";
import { downloadScreenshot } from "../../utils/screenshotCapture";
import { captureScreenshotWithOverlay } from "../../utils/screenshotCaptureFlow";
import { invoke } from "@tauri-apps/api/core";

export function ScreenshotTab() {
  const { documents, loadDocuments, deleteDocument } = useDocumentStore();
  const [selectedScreenshot, setSelectedScreenshot] = useState<any | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter documents to show only screenshots
  const screenshots = documents.filter(
    (doc) => doc.category === "Screenshots" || doc.tags?.includes("screenshot")
  );

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCapture = async () => {
    try {
      setIsCapturing(true);
      setPreviewImage(null);
      const base64Image = await captureScreenshotWithOverlay();
      if (base64Image) {
        setPreviewImage(`data:image/png;base64,${base64Image}`);
      } else {
        setIsCapturing(false);
      }
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      alert("Failed to capture screenshot. Please try again.");
      setIsCapturing(false);
    }
  };

  const handleSaveScreenshot = async () => {
    if (!previewImage) return;

    try {
      // Extract base64 data
      const base64Data = previewImage.split(',')[1];

      // Create document from screenshot
      const timestamp = new Date().toISOString();
      const fileName = `screenshot-${timestamp}.png`;
      const docTitle = `Screenshot - ${new Date().toLocaleString()}`;

      const documentData = {
        title: docTitle,
        filePath: fileName,
        fileType: "image",
        content: base64Data,
        contentHash: await generateHash(base64Data),
        category: "Screenshots",
        tags: ["screenshot", "image-capture"],
        dateAdded: timestamp,
        dateModified: timestamp,
        priorityRating: 0,
        prioritySlider: 0,
        priorityScore: 3,
        isArchived: false,
        isFavorite: false,
        metadata: {
          imageFormat: "png",
          capturedAt: timestamp,
        },
      };

      const savedDoc = await invoke("save_document", { document: documentData });
      console.log("Screenshot saved:", savedDoc);

      // Reset preview and reload
      setPreviewImage(null);
      await loadDocuments();
    } catch (error) {
      console.error("Failed to save screenshot:", error);
      alert("Failed to save screenshot. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDiscardScreenshot = () => {
    setPreviewImage(null);
    setIsCapturing(false);
  };

  const handleDownload = (screenshot: any) => {
    try {
      if (screenshot.content) {
        downloadScreenshot(screenshot.content, screenshot.title);
      }
    } catch (error) {
      console.error("Failed to download screenshot:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this screenshot?")) {
      try {
        await deleteDocument(id);
        await loadDocuments();
        if (selectedScreenshot?.id === id) {
          setSelectedScreenshot(null);
        }
      } catch (error) {
        console.error("Failed to delete screenshot:", error);
        alert("Failed to delete screenshot. Please try again.");
      }
    }
  };

  async function generateHash(content: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  }

  const getBase64Image = (screenshot: any): string => {
    if (screenshot.content) {
      return `data:image/png;base64,${screenshot.content}`;
    }
    return "";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Screenshots</h2>
          <button
            onClick={handleCapture}
            disabled={isCapturing || previewImage !== null}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {isCapturing ? "Capturing..." : "Capture Screenshot"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Capture and manage screenshots. Screenshots are automatically saved to your document library.
        </p>
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Screenshot Preview</h3>
              <button
                onClick={handleDiscardScreenshot}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewImage}
                alt="Screenshot preview"
                className="w-full border border-border rounded-lg"
              />
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <button
                onClick={handleSaveScreenshot}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Screenshot
              </button>
              <button
                onClick={handleDiscardScreenshot}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Screenshot List */}
        <div className="w-80 border-r border-border overflow-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Captured Screenshots ({screenshots.length})
            </h3>
            {screenshots.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No screenshots yet. Click "Capture Screenshot" to capture one.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedScreenshot?.id === screenshot.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-card border border-border hover:bg-muted"
                    }`}
                    onClick={() => setSelectedScreenshot(screenshot)}
                  >
                    <div className="flex items-center gap-2">
                      {screenshot.content ? (
                        <img
                          src={getBase64Image(screenshot)}
                          alt="Screenshot thumbnail"
                          className="w-16 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {screenshot.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(screenshot.dateAdded).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Screenshot Viewer */}
        <div className="flex-1 overflow-auto">
          {selectedScreenshot ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-card border border-border rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {selectedScreenshot.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(selectedScreenshot.dateAdded).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {selectedScreenshot.content ? (
                    <img
                      src={getBase64Image(selectedScreenshot)}
                      alt="Selected screenshot"
                      className="w-full border border-border rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                      <Camera className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleDownload(selectedScreenshot)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(selectedScreenshot.id)}
                      className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {screenshots.length === 0
                    ? "Capture your first screenshot to get started"
                    : "Select a screenshot to view it"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
