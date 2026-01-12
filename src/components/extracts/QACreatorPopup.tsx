import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Check } from "lucide-react";
import { createQAFromExtract } from "../../api/extract-review";
import type { LearningItem } from "../../api/learning-items";
import { cn } from "../../utils";

interface QACreatorPopupProps {
    extractId: string;
    onCreated: (item: LearningItem) => void;
    onCancel: () => void;
}

export function QACreatorPopup({ extractId, onCreated, onCancel }: QACreatorPopupProps) {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const questionRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Focus question on mount
        questionRef.current?.focus();

        // Escape to close
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCancel();
            }
            // Ctrl+Enter to submit
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                handleSubmit();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCancel, question, answer]);

    const handleSubmit = async () => {
        if (!question.trim() || !answer.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const item = await createQAFromExtract(extractId, question, answer);
            onCreated(item);
        } catch (error) {
            console.error("Failed to create QA:", error);
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
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Create Q&A Card</h3>
                            <p className="text-sm text-muted-foreground">Create a question and answer pair from this extract</p>
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
                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Question</label>
                        <textarea
                            ref={questionRef}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Enter your question here..."
                            className="w-full min-h-[100px] p-4 bg-muted/30 border border-input rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Answer</label>
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Enter the answer..."
                            className="w-full min-h-[150px] p-4 bg-muted/30 border border-input rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/10 rounded-b-xl flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        Press <span className="font-medium text-foreground">Ctrl+Enter</span> to save
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!question.trim() || !answer.trim() || isSubmitting}
                            className={cn(
                                "px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-primary/20 transition-all",
                                (!question.trim() || !answer.trim() || isSubmitting) && "opacity-50 cursor-not-allowed shadow-none"
                            )}
                        >
                            <Check className="w-4 h-4" />
                            {isSubmitting ? "Creating..." : "Create Card"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
