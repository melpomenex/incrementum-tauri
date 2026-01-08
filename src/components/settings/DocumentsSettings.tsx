import { useSettingsStore } from "../../stores/settingsStore";

export function DocumentsSettings() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Import Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Document Import</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="defaultCategory" className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-process on import</p>
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
              <p className="font-medium">Detect duplicates</p>
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
        <h3 className="text-lg font-semibold mb-3">PDF Documents</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="pdfZoom" className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value={0.5}>50%</option>
              <option value={0.75}>75%</option>
              <option value={1.0}>100%</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
              <option value={2.0}>200%</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-page spread</p>
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
        <h3 className="text-lg font-semibold mb-3">EPUB Documents</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="epubFontSize" className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            />
          </div>

          <div>
            <label htmlFor="epubFontFamily" className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans-serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-scroll</p>
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
        <h3 className="text-lg font-semibold mb-3">Auto-Segmentation</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="segmentationMethod" className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value="semantic">Semantic (AI-powered)</option>
              <option value="paragraph">Paragraph-based</option>
              <option value="fixed">Fixed-length</option>
              <option value="smart">Smart (adaptive)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              How to split documents into extracts
            </p>
          </div>

          <div>
            <label htmlFor="segmentLength" className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Approximate words per extract
            </p>
          </div>

          <div>
            <label htmlFor="overlapLength" className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Overlap between segments for context
            </p>
          </div>
        </div>
      </div>

      {/* OCR Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-3">OCR (Optical Character Recognition)</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="ocrProvider" className="block text-sm font-medium mb-2">
              OCR Provider
            </label>
            <select
              id="ocrProvider"
              value={settings.documents.ocr.provider}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    ocr: { ...settings.documents.ocr, provider: e.target.value as any },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value="tesseract">Tesseract (Local)</option>
              <option value="google">Google Document AI</option>
              <option value="aws">AWS Textract</option>
              <option value="azure">Azure Computer Vision</option>
            </select>
          </div>

          <div>
            <label htmlFor="ocrLanguage" className="block text-sm font-medium mb-2">
              OCR Language
            </label>
            <select
              id="ocrLanguage"
              value={settings.documents.ocr.language}
              onChange={(e) =>
                updateSettings({
                  documents: {
                    ...settings.documents,
                    ocr: { ...settings.documents.ocr, language: e.target.value },
                  },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value="eng">English</option>
              <option value="spa">Spanish</option>
              <option value="fra">French</option>
              <option value="deu">German</option>
              <option value="chi_sim">Chinese (Simplified)</option>
              <option value="jpn">Japanese</option>
              <option value="kor">Korean</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-OCR images</p>
              <p className="text-xs text-muted-foreground">
                Automatically OCR images in imported documents
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documents.ocr.autoOCR}
                onChange={(e) =>
                  updateSettings({
                    documents: { ...settings.documents, ocr: { ...settings.documents.ocr, autoOCR: e.target.checked } },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Storage */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Storage & Cache</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cache document content</p>
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
              <p className="font-medium">Auto-cleanup cache</p>
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
