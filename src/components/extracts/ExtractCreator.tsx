import { useState, useRef, useEffect } from "react";
import { Plus, X, Scissors, MessageSquare } from "lucide-react";
import { createExtract } from "../../api/extracts";
import { ClozeCreatorPopup } from "./ClozeCreatorPopup";
import { QACreatorPopup } from "./QACreatorPopup";

interface ExtractCreatorProps {
  documentId: string;
  selectedText?: string;
  onSave?: (extract: {
    content: string;
    note?: string;
    tags: string[];
    category?: string;
  }) => void;
  onCancel: () => void;
}

export function ExtractCreator({
  documentId,
  selectedText = "",
  onSave,
  onCancel,
}: ExtractCreatorProps) {
  const [content, setContent] = useState(selectedText);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Chained creation state
  const [creationMode, setCreationMode] = useState<'edit' | 'cloze' | 'qa'>('edit');
  const [savedExtractId, setSavedExtractId] = useState<string | null>(null);

  const tagInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    "Important",
    "Definition",
    "Example",
    "Quote",
    "Concept",
    "Question",
  ];

  const colors = [
    { name: "Red", value: "bg-red-500" },
    { name: "Orange", value: "bg-orange-500" },
    { name: "Yellow", value: "bg-yellow-500" },
    { name: "Green", value: "bg-green-500" },
    { name: "Blue", value: "bg-blue-500" },
    { name: "Purple", value: "bg-purple-500" },
  ];

  const [selectedColor, setSelectedColor] = useState(colors[3].value); // Default to green

  useEffect(() => {
    setContent(selectedText);
  }, [selectedText]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async (nextAction?: 'cloze' | 'qa') => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      const extract = await createExtract({
        document_id: documentId,
        content: content.trim(),
        note: note.trim() || undefined,
        tags,
        category: category || undefined,
        color: selectedColor,
      });

      if (onSave) {
        onSave({
          content: extract.content,
          note: extract.notes,
          tags: extract.tags,
          category: extract.category,
        });
      }

      if (nextAction) {
        setSavedExtractId(extract.id);
        setCreationMode(nextAction);
      } else {
        onCancel();
      }
    } catch (error) {
      console.error("Failed to save extract:", error);
      // Only close if it was a basic save? Or keep open on error?
      // Keep open so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  if (creationMode === 'cloze' && savedExtractId) {
    return (
      <ClozeCreatorPopup
        extractId={savedExtractId}
        selectedText={content}
        selectionRange={[0, content.length]}
        onCreated={() => onCancel()}
        onCancel={onCancel}
      />
    );
  }

  if (creationMode === 'qa' && savedExtractId) {
    return (
      <QACreatorPopup
        extractId={savedExtractId}
        onCreated={() => onCancel()}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Create Extract</h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Selected Text */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Extracted Text
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[120px] p-3 bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Select text from the document or enter your extract here..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory("")}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${!category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
              >
                None
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Highlight Color
            </label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full ${color.value} ${selectedColor === color.value
                    ? "ring-2 ring-offset-2 ring-foreground"
                    : ""
                    }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-md"
                >
                  <span className="text-sm">{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-primary/20 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="flex-1 px-3 py-2 bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add a tag..."
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[80px] p-3 bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Add your notes about this extract..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave('cloze')}
              disabled={!content.trim() || isSaving}
              className="px-3 py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-md transition-colors text-sm flex items-center gap-2"
              title="Save and create Cloze card"
            >
              <Scissors className="w-4 h-4" />
              + Cloze
            </button>
            <button
              onClick={() => handleSave('qa')}
              disabled={!content.trim() || isSaving}
              className="px-3 py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-md transition-colors text-sm flex items-center gap-2"
              title="Save and create Q&A card"
            >
              <MessageSquare className="w-4 h-4" />
              + Q&A
            </button>
          </div>
          <button
            onClick={() => handleSave()}
            disabled={!content.trim() || isSaving}
            className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Extract"}
          </button>
        </div>
      </div>
    </div>
  );
}
