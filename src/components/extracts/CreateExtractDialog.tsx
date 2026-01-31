import { useState, useEffect } from "react";
import { X, Tag as TagIcon, FolderOpen, Lightbulb, Bold, Italic, Code, List, Layers, Eye, BookOpen } from "lucide-react";
import { createExtract, CreateExtractInput, Extract } from "../../api/extracts";
import type { PdfSelectionContext } from "../../types/selection";
import { generateLearningItemsFromExtract } from "../../api/learning-items";
import { ClozeCreatorPopup } from "./ClozeCreatorPopup";
import { QACreatorPopup } from "./QACreatorPopup";
import { useToast } from "../common/Toast";
import { useDocumentStore } from "../../stores/documentStore";

interface CreateExtractDialogProps {
  documentId: string;
  selectedText?: string;
  pageNumber?: number;
  selectionContext?: PdfSelectionContext | null;
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (extract: Extract) => void;
}

// Common categories
const COMMON_CATEGORIES = [
  "Definition",
  "Concept",
  "Example",
  "Formula",
  "Quote",
  "Key Point",
  "Procedure",
];

// Common highlight colors
const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Purple", value: "#e9d5ff" },
];

// Annotation types
type AnnotationType = "bold" | "italic" | "code" | "bullet";

const ANNOTATIONS = [
  { type: "bold" as AnnotationType, icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { type: "italic" as AnnotationType, icon: Italic, label: "Italic", prefix: "_", suffix: "_" },
  { type: "code" as AnnotationType, icon: Code, label: "Code", prefix: "`", suffix: "`" },
  { type: "bullet" as AnnotationType, icon: List, label: "Bullet", prefix: "• ", suffix: "" },
];

export function CreateExtractDialog({
  documentId,
  selectedText = "",
  pageNumber = 0,
  selectionContext = null,
  isOpen,
  onClose,
  onCreate,
}: CreateExtractDialogProps) {
  const [content, setContent] = useState(selectedText);
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [progressiveLevel, setProgressiveLevel] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [creationMode, setCreationMode] = useState<"edit" | "cloze" | "qa">("edit");
  const [savedExtractId, setSavedExtractId] = useState<string | null>(null);
  const toast = useToast();
  const { documents } = useDocumentStore();

  // Get the current document for context display
  const currentDocument = documents.find((d) => d.id === documentId);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Only update content if selectedText is provided (don't clear it if selectedText becomes empty on close)
      if (selectedText) {
        setContent(selectedText);
      }
      setNotes("");
      setCategory("");
      setTags([]);
      setTagInput("");
      setProgressiveLevel(0);
      setShowPreview(false);
      setError(null);
      setCreationMode("edit");
      setSavedExtractId(null);
    }
  }, [isOpen, selectedText]);

  // Annotation functions
  const applyAnnotation = (annotation: typeof ANNOTATIONS[0]) => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (!textarea || textarea.tagName !== "TEXTAREA") return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newText = content.substring(0, start) +
      annotation.prefix + selectedText + annotation.suffix +
      content.substring(end);

    setContent(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + annotation.prefix.length,
        end + annotation.prefix.length
      );
    }, 0);
  };

  // Format content for preview (simple markdown-like rendering)
  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code class='px-1 py-0.5 bg-muted rounded text-sm'>$1</code>")
      .replace(/^• (.*$)/gm, "<li>$1</li>")
      .replace(/\n/g, "<br>");
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCreate = async (action: "extract" | "generate" | "cloze" | "qa") => {
    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const input: CreateExtractInput = {
        document_id: documentId,
        content: content.trim(),
        note: notes.trim() || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
        color: highlightColor,
        page_number: pageNumber || undefined,
        selection_context: selectionContext || undefined,
        max_disclosure_level: progressiveLevel > 0 ? progressiveLevel : undefined,
      };

      const extract = await createExtract(input);
      toast.success("Extract created");

      if (action === "generate") {
        setIsGenerating(true);
        await generateLearningItemsFromExtract(extract.id);
      }

      onCreate?.(extract);
      if (action === "cloze" || action === "qa") {
        setSavedExtractId(extract.id);
        setCreationMode(action);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create extract");
    } finally {
      setIsCreating(false);
      setIsGenerating(false);
    }
  };

  if (creationMode === "cloze" && savedExtractId) {
    return (
      <ClozeCreatorPopup
        extractId={savedExtractId}
        selectedText={content}
        selectionRange={[0, content.length]}
        onCreated={() => onClose()}
        onCancel={onClose}
      />
    );
  }

  if (creationMode === "qa" && savedExtractId) {
    return (
      <QACreatorPopup
        extractId={savedExtractId}
        onCreated={() => onClose()}
        onCancel={onClose}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Create Extract
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Document Context */}
        {currentDocument && (
          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{currentDocument.title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {pageNumber > 0 ? `Page ${pageNumber}` : 'Selected text'}
                </span>
                {currentDocument.progressPercent !== undefined && currentDocument.progressPercent > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(currentDocument.progressPercent)}% complete
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Content with Annotation Toolbar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Content <span className="text-destructive">*</span>
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded transition-colors flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                {showPreview ? "Edit" : "Preview"}
              </button>
            </div>

            {/* Annotation Toolbar */}
            {!showPreview && (
              <div className="flex items-center gap-1 mb-2 p-2 bg-muted/50 rounded-md">
                {ANNOTATIONS.map((annotation) => (
                  <button
                    key={annotation.type}
                    onClick={() => applyAnnotation(annotation)}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title={annotation.label}
                  >
                    <annotation.icon className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
                <div className="flex-1" />
                <span className="text-xs text-muted-foreground">
                  Select text to format
                </span>
              </div>
            )}

            {!showPreview ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the extract content... Use **bold**, _italic_, `code`, or • for bullets"
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <div className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground min-h-[100px]">
                {content ? (
                  <div dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
                ) : (
                  <span className="text-muted-foreground">Preview will appear here...</span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your thoughts, context, or explanations..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              Category
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? "" : cat)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Or enter custom category..."
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <TagIcon className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Highlight Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Highlight Color
            </label>
            <div className="flex flex-wrap gap-2">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setHighlightColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    highlightColor === color.value
                      ? "border-primary scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Progressive Disclosure Level */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Layers className="w-4 h-4 inline mr-1" />
              Progressive Disclosure Level
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Set how many levels of difficulty this extract should be revealed across (0 = disabled)
            </p>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setProgressiveLevel(level)}
                  className={`w-10 h-10 rounded-md transition-all ${
                    progressiveLevel === level
                      ? "bg-primary text-primary-foreground scale-105"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={`Level ${level}`}
                >
                  {level}
                </button>
              ))}
            </div>
            {progressiveLevel > 0 && (
              <p className="text-xs text-primary mt-2">
                Extract will be revealed across {progressiveLevel} level{progressiveLevel > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 bg-card border border-border text-foreground rounded-md hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleCreate("extract")}
            disabled={isCreating || isGenerating}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Extract"}
          </button>
          <button
            onClick={() => handleCreate("generate")}
            disabled={isCreating || isGenerating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">⏳</span>
                Generating Cards...
              </>
            ) : (
              <>
                <span>Create & Generate Cards</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleCreate("cloze")}
            disabled={isCreating || isGenerating}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Create & Cloze
          </button>
          <button
            onClick={() => handleCreate("qa")}
            disabled={isCreating || isGenerating}
            className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            Create & Q&A
          </button>
        </div>
      </div>
    </div>
  );
}
