import { useState, useEffect, useRef } from "react";
import { Scissors, X, Check } from "lucide-react";
import { createClozeFromExtract } from "../../api/extract-review";
import type { LearningItem } from "../../api/learning-items";
import { cn } from "../../utils";

interface ClozeCreatorPopupProps {
    extractId: string;
    selectedText: string;
    selectionRange: [number, number]; // Currently unused but kept for potential robust range handling
    onCreated: (item: LearningItem) => void;
    onCancel: () => void;
}

export function ClozeCreatorPopup({ extractId, selectedText, selectionRange, onCreated, onCancel }: ClozeCreatorPopupProps) {
    // Pre-fill with selected text wrapped in cloze deletion syntax [1...]
    // Wait, backend expects cloze_text (full text with clozes) and cloze_ranges.
    // BUT the API creates ranges.
    // The backend `create_cloze_from_extract` takes `cloze_text` and `cloze_ranges`.
    // Ideally, we want to allow the user to edit the text that becomes the flashcard.
    // Since we are selecting text *from* the extract, the "Flashcard" usually consists of the
    // context (sentence/paragraph) with the selected part hidden.

    // For simplicity: We will present the *selected text* as the cloze content.
    // Users typically select a sentence and want to hide a word.
    // But our current flow is: Select text -> create cloze.
    // It's ambiguous: did they select the whole sentence, or just the word to hide?
    // SuperMemo flow: You select the part to HIDE. The context is the surrounding text.
    // 
    // Let's assume the user selects the text they want to HIDE.
    // We need the surrounding context.
    // But `ExtractScrollItem` only passed the text.
    //
    // Alternative design: User inputs the full text (pre-filled with selection or extract content)
    // and marks clozes.
    //
    // Let's go with: Input field pre-filled with `selectedText` if shorter than 200 chars,
    // or just empty if long, allowing user to paste/type.
    //
    // Actually, checking `ExtractScrollItem` again:
    // `onCreateCloze(text, [0, text.length])`
    // It passes `selection.toString()`.

    // Design decision: The popup allows editing the "Text" of the card.
    // The user should wrap parts in {{...}} or [...] to mark deletions.
    // Backend `create_cloze_from_extract` takes ranges. This is hard for frontend to calculate manually if editing.
    // 
    // Let's look at `create_cloze_from_extract` in backend again.
    // It takes `cloze_ranges`.
    // If we want to support flexible editing, we should parse the text here to find ranges.
    // format: "The {{capital}} of France is Paris."
    // or "The [...] of France is Paris."
    //
    // Let's implement a simple parser here: Use `{{content}}` for clozes.

    const [text, setText] = useState(selectedText);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();

        // If text doesn't have {{}}, wrap the whole thing? No, that's weird.
        // If the user selected a word, we probably want the Context.
        // But we don't have context passed easily yet.
        // Let's assume the user copies the context or we improve ExtractScrollItem later.
        // For now, let's just let them edit the text.
    }, []);

    const handleSubmit = async () => {
        if (!text.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Parse {{...}} ranges
            const ranges: [number, number][] = [];
            let cleanText = "";
            let currentIndex = 0;
            let regex = /\{\{(.*?)\}\}/g;
            let match;
            let lastIndex = 0;

            // We need to construct the clean text (without {{}}) and track where the content was
            // This is a bit complex.
            // Simpler approach: Just send the text with {{}} and let backend handle?
            // No, backend expects ranges.

            // Let's reconstruct manually
            const parts = text.split(/(\{\{.*?\}\})/);
            let runningLength = 0;

            cleanText = parts.map(part => {
                if (part.startsWith('{{') && part.endsWith('}}')) {
                    const content = part.slice(2, -2);
                    const start = runningLength;
                    const end = runningLength + content.length;
                    ranges.push([start, end]);
                    runningLength += content.length;
                    return content;
                } else {
                    runningLength += part.length;
                    return part;
                }
            }).join('');

            if (ranges.length === 0) {
                // If no clozes, maybe warn? or just wrap the whole thing if short?
                // Let's wrap everything if no {{}} found
                ranges.push([0, text.length]);
                cleanText = text;
            }

            const item = await createClozeFromExtract(extractId, cleanText, ranges);
            onCreated(item);
        } catch (error) {
            console.error("Failed to create Cloze:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg text-secondary-foreground">
                            <Scissors className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Create Cloze Deletion</h3>
                            <p className="text-sm text-muted-foreground">Wrap text in {"{{ }}"} to hide it</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Card Text</label>
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="e.g. The {{capital}} of France is Paris."
                            className="w-full min-h-[150px] p-4 bg-muted/30 border border-input rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-secondary/50 text-foreground placeholder:text-muted-foreground font-mono text-sm leading-relaxed"
                        />
                        <p className="text-xs text-muted-foreground">
                            Tip: Select text and press <strong>Ctrl+B</strong> to wrap in brackets (todo)
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/10 rounded-b-xl flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim() || isSubmitting}
                        className={cn(
                            "px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-secondary/20 transition-all",
                            (!text.trim() || isSubmitting) && "opacity-50 cursor-not-allowed shadow-none"
                        )}
                    >
                        <Check className="w-4 h-4" />
                        {isSubmitting ? "Creating..." : "Create Cloze"}
                    </button>
                </div>
            </div>
        </div>
    );
}
