import { useSettingsStore } from "../../stores/settingsStore";
import { OCRSettings } from "./OCRSettings";

export function DocumentsSettings() {
  const { settings, updateSettings } = useSettingsStore();
  const { updateSettingsCategory } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Import Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Document Import</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="defaultCategory" className="block text-sm font-medium text-foreground mb-2">
              Default Category
            </label>
            <input
              type="text"
              id="defaultCategory"
              value={settings.documents.defaultCategory}
              onChange={(e) =>
                updateSettings({
                  documents: { ...settings.documents, defaultCategory: e.target.value },
                })
              }
              placeholder="Uncategorized"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-process on import</p>
              <p className="text-xs text-muted-foreground">
                Automatically extract and segment imported documents
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documents.autoProcessOnImport}
                onChange={(e) =>
                  updateSettings({
                    documents: { ...settings.documents, autoProcessOnImport: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Detect duplicates</p>
              <p className="text-xs text-muted-foreground">
                Check for duplicate documents by content hash
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documents.detectDuplicates}
                onChange={(e) =>
                  updateSettings({
                    documents: { ...settings.documents, detectDuplicates: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* PDF Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">PDF Documents</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="pdfZoom" className="block text-sm font-medium text-foreground mb-2">
              Default Zoom Level
            </label>
            <select
              id="pdfZoom"
              value={settings.documents.pdfSettings.defaultZoom}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    pdfSettings: { ...settings.documents.pdfSettings, defaultZoom: parseFloat(e.target.value) },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="{0.5}" className="text-foreground">50%</option>
              <option value="{0.75}" className="text-foreground">75%</option>
              <option value="{1.0}" className="text-foreground">100%</option>
              <option value="{1.25}" className="text-foreground">125%</option>
              <option value="{1.5}" className="text-foreground">150%</option>
              <option value="{2.0}" className="text-foreground">200%</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Two-page spread</p>
              <p className="text-xs text-muted-foreground">
                Show two pages side by side by default
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documents.pdfSettings.twoPageSpread}
                onChange={(e) =>
                  updateSettings({
                    documents: {
                      ...settings.documents,
                      pdfSettings: { ...settings.documents.pdfSettings, twoPageSpread: e.target.checked },
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* EPUB Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">EPUB Documents</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="epubFontSize" className="block text-sm font-medium text-foreground mb-2">
              Default Font Size
            </label>
            <input
              type="number"
              id="epubFontSize"
              min="10"
              max="30"
              value={settings.documents.epubSettings.fontSize}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    epubSettings: { ...settings.documents.epubSettings, fontSize: parseInt(e.target.value) || 16 },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
          </div>

          <div>
            <label htmlFor="epubFontFamily" className="block text-sm font-medium text-foreground mb-2">
              Font Family
            </label>
            <select
              id="epubFontFamily"
              value={settings.documents.epubSettings.fontFamily}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    epubSettings: { ...settings.documents.epubSettings, fontFamily: e.target.value },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="serif" className="text-foreground">Serif</option>
              <option value="sans-serif" className="text-foreground">Sans-serif</option>
              <option value="monospace" className="text-foreground">Monospace</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-scroll</p>
              <p className="text-xs text-muted-foreground">
                Automatically scroll to keep current position visible
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documents.epubSettings.autoScroll}
                onChange={(e) =>
                  updateSettings({
                    documents: {
                      ...settings.documents,
                      epubSettings: { ...settings.documents.epubSettings, autoScroll: e.target.checked },
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Auto-Segmentation */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Auto-Segmentation</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="segmentationMethod" className="block text-sm font-medium text-foreground mb-2">
              Segmentation Method
            </label>
            <select
              id="segmentationMethod"
              value={settings.documents.segmentation.method}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    segmentation: { ...settings.documents.segmentation, method: e.target.value as any },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="semantic" className="text-foreground">Semantic (AI-powered)</option>
              <option value="paragraph" className="text-foreground">Paragraph-based</option>
              <option value="fixed" className="text-foreground">Fixed-length</option>
              <option value="smart" className="text-foreground">Smart (adaptive)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              How to split documents into extracts
            </p>
          </div>

          <div>
            <label htmlFor="segmentLength" className="block text-sm font-medium text-foreground mb-2">
              Target Segment Length (words)
            </label>
            <input
              type="number"
              id="segmentLength"
              min="50"
              max="1000"
              value={settings.documents.segmentation.targetLength}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    segmentation: { ...settings.documents.segmentation, targetLength: parseInt(e.target.value) || 200 },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Approximate words per extract
            </p>
          </div>

          <div>
            <label htmlFor="overlapLength" className="block text-sm font-medium text-foreground mb-2">
              Overlap Length (words)
            </label>
            <input
              type="number"
              id="overlapLength"
              min="0"
              max="100"
              value={settings.documents.segmentation.overlap}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    segmentation: { ...settings.documents.segmentation, overlap: parseInt(e.target.value) || 0 },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Overlap between segments for context
            </p>
          </div>
        </div>
      </div>

      {/* OCR Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">OCR (Optical Character Recognition)</h3>
        <OCRSettings
          settings={settings.documents.ocr}
          onUpdateSettings={(updates) =>
            updateSettingsCategory("documents", {
              ...settings.documents,
              ocr: { ...settings.documents.ocr, ...updates },
            })
          }
        />
      </div>

      {/* Storage */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Storage & Cache</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Cache document content</p>
              <p className="text-xs text-muted-foreground">
                Store processed documents locally for faster access
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documents.cacheContent}
                onChange={(e) =>
                  updateSettings({
                    documents: { ...settings.documents, cacheContent: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-cleanup cache</p>
              <p className="text-xs text-muted-foreground">
                Remove cached documents older than 30 days
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documents.autoCleanupCache}
                onChange={(e) =>
                  updateSettings({
                    documents: { ...settings.documents, autoCleanupCache: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
