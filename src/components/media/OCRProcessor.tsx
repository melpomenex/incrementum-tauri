import { useState, useRef, useCallback } from "react";
import {
  Scan,
  Upload,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  Download,
  Trash2,
  Edit,
  Save,
  Eye,
  Settings,
  Image as ImageIcon,
  Languages,
} from "lucide-react";
import {
  performOCRWithProgress,
  performOCR,
  extractTextFromMultipleImages,
  OCROptions,
  OCRResult,
  OCRLanguage,
  AVAILABLE_LANGUAGES,
  getLanguageDisplayName,
  validateOCRResult,
  cleanOCRText,
  getOCRStatistics,
  calculateOCRQuality,
  exportOCRToText,
  exportOCRWithPositions,
  saveOCRResult,
} from "../../api/ocr";

interface OCRProcessorProps {
  onTextExtracted?: (text: string, result: OCRResult) => void;
}

type ProcessingStatus = "idle" | "processing" | "complete" | "error";

export function OCRProcessor({ onTextExtracted }: OCRProcessorProps) {
  const [images, setImages] = useState<Array<{ id: string; file: File; preview: string }>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(OCRLanguage.English);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImage = images[currentImageIndex];

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newImages: Array<{ id: string; file: File; preview: string }> = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        return;
      }

      const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = URL.createObjectURL(file);

      newImages.push({ id, file, preview });
    });

    setImages((prev) => [...prev, ...newImages]);
    if (images.length === 0 && newImages.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [images.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (currentImageIndex >= filtered.length) {
        setCurrentImageIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
    setResult(null);
    setStatus("idle");
  };

  const handleProcessImage = async () => {
    if (!currentImage) return;

    setStatus("processing");
    setProgress(0);
    setError(null);
    setResult(null);

    const options: OCROptions = {
      language: selectedLanguage,
    };

    try {
      const ocrResult = await performOCRWithProgress(
        currentImage.file,
        (progress, status) => {
          setProgress(progress);
          setStatusMessage(status);
        },
        options
      );

      setResult(ocrResult);
      setEditedText(ocrResult.text);
      setStatus("complete");

      // Auto-save result
      saveOCRResult(currentImage.id, ocrResult);

      onTextExtracted?.(ocrResult.text, ocrResult);
    } catch (err) {
      setError(err as string);
      setStatus("error");
    }
  };

  const handleProcessAll = async () => {
    if (images.length === 0) return;

    setStatus("processing");
    setProgress(0);
    setError(null);

    const files = images.map((img) => img.file);

    try {
      const results = await extractTextFromMultipleImages(
        files,
        (current, total) => {
          setProgress(Math.round((current / total) * 100));
          setStatusMessage(`Processing image ${current} of ${total}...`);
        },
        { language: selectedLanguage }
      );

      // Merge all results
      const merged = {
        text: results.map((r) => r.text).join("\n\n--- Next Image ---\n\n"),
        confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
        lines: results.flatMap((r) => r.lines),
        words: results.flatMap((r) => r.words),
      };

      setResult(merged);
      setEditedText(merged.text);
      setStatus("complete");

      onTextExtracted?.(merged.text, merged);
    } catch (err) {
      setError(err as string);
      setStatus("error");
    }
  };

  const handleSaveEdit = () => {
    if (result) {
      const updated: OCRResult = {
        ...result,
        text: editedText,
      };
      setResult(updated);
      setIsEditing(false);
      saveOCRResult(currentImage.id, updated);
    }
  };

  const handleUseCleanText = () => {
    if (result) {
      const cleaned = cleanOCRText(result.text);
      setEditedText(cleaned);
    }
  };

  const handleExport = () => {
    if (!result) return;

    const text = showSettings ? exportOCRWithPositions(result) : exportOCRToText(result);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr-result-${currentImage.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = result ? getOCRStatistics(result) : null;
  const quality = result ? calculateOCRQuality(result) : null;
  const validation = result ? validateOCRResult(result) : null;

  return (
    <div className="h-full flex">
      {/* Left panel - Image viewer */}
      <div className="w-1/2 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Scan className="w-5 h-5 text-primary" />
              OCR Image Processor
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1"
              >
                <Upload className="w-4 h-4" />
                Add Images
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>
          </div>

          {/* Language selection */}
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={status === "processing"}
            >
              {AVAILABLE_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <div className="flex-1 p-4 overflow-y-auto">
          {images.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="h-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground"
            >
              <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">Drop images here</p>
              <p className="text-sm">or click "Add Images" to browse</p>
              <p className="text-xs mt-2">Supports JPG, PNG, BMP, TIFF</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image thumbnails */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex
                        ? "border-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <img
                      src={img.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {index === currentImageIndex && result && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Current image preview */}
              {currentImage && (
                <div className="relative">
                  <img
                    src={currentImage.preview}
                    alt="Preview"
                    className="w-full rounded-lg border border-border"
                  />
                  <button
                    onClick={() => handleRemoveImage(currentImage.id)}
                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Process buttons */}
              {currentImage && (
                <div className="flex gap-2">
                  <button
                    onClick={handleProcessImage}
                    disabled={status === "processing"}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {status === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4" />
                        Extract Text
                      </>
                    )}
                  </button>
                  {images.length > 1 && (
                    <button
                      onClick={handleProcessAll}
                      disabled={status === "processing"}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      Process All ({images.length})
                    </button>
                  )}
                </div>
              )}

              {/* Progress */}
              {status === "processing" && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{statusMessage}</span>
                    <span className="text-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Text result */}
      <div className="w-1/2 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Extracted Text
            </h2>
            {result && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {isEditing ? (
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 text-green-500 hover:bg-green-500/20 rounded-lg"
                    title="Save edits"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    title="Edit text"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                  title="Export"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{stats.totalLines} lines</span>
              <span>{stats.totalWords} words</span>
              <span>{stats.avgConfidence.toFixed(1)}% confidence</span>
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!result ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No text extracted yet</p>
                <p className="text-xs mt-1">Select an image and click "Extract Text"</p>
              </div>
            </div>
          ) : isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-full p-4 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {result.text}
              </p>
            </div>
          )}
        </div>

        {/* Quality indicators */}
        {result && validation && !isEditing && (
          <div className="p-4 border-t border-border space-y-2">
            {quality && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Quality Score:</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      quality.score >= 70
                        ? "bg-green-500"
                        : quality.score >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${quality.score}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{quality.score}/100</span>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className={`p-2 rounded-lg ${
                validation.isValid
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-destructive/10 text-destructive"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {validation.isValid ? "Warnings" : "Issues Detected"}
                  </span>
                </div>
                <ul className="text-xs space-y-1">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {quality && quality.issues.length > 0 && (
              <div className="p-2 bg-muted/30 rounded">
                <p className="text-xs font-medium text-foreground mb-1">Quality Issues:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {quality.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleUseCleanText}
                className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:opacity-90"
              >
                Apply Auto-Clean
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded hover:opacity-90"
              >
                Manual Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
