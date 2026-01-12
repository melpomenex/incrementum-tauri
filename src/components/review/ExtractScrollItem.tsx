import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, AlertCircle, Star, CheckCircle, Sparkles, Scissors, MessageSquare, FileText, Highlighter } from "lucide-react";
import type { Extract } from "../../api/extracts";
import { cn } from "../../utils";

interface ExtractScrollItemProps {
    extract: Extract;
    documentTitle: string;
    onRate: (rating: number) => void;
    onCreateCloze: (selectedText: string, range: [number, number]) => void;
    onCreateQA: () => void;
}

/**
 * Full-screen extract component for scroll mode review.
 * Shows extract content, allows creating flashcards, and provides rating buttons.
 */
export function ExtractScrollItem({
    extract,
    documentTitle,
    onRate,
    onCreateCloze,
    onCreateQA
}: ExtractScrollItemProps) {
    const [showControls, setShowControls] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcuts: 1-4 to rate, C for Cloze, Q for QA
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in input
            if ((e.target as HTMLElement).tagName === "INPUT" ||
                (e.target as HTMLElement).tagName === "TEXTAREA") {
                return;
            }

            if (e.key === "c" || e.key === "C") {
                e.preventDefault();
                handleCreateCloze();
            } else if (e.key === "q" || e.key === "Q") {
                e.preventDefault();
                onCreateQA();
            } else if (e.key === "1") {
                onRate(1);
            } else if (e.key === "2") {
                onRate(2);
            } else if (e.key === "3") {
                onRate(3);
            } else if (e.key === "4") {
                onRate(4);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onRate, onCreateQA]);

    const handleCreateCloze = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
            // If no selection, maybe notify user? For now just ignore
            return;
        }

        const range = selection.getRangeAt(0);
        const text = selection.toString();

        // Find offset relative to contentRef
        // This is simplified and might need robust handling for complex DOMs
        // For now assuming content is rendered as simple text or minimal HTML
        // We'll pass the simple text and let the popup handler refine it
        onCreateCloze(text, [0, text.length]); // Placeholder range, real logic in popup or parent
    };

    const stateLabel = extract.review_count === 0
        ? "New Extract"
        : "Review";

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/30">
            {/* Card Type Badge */}
            <div className="absolute top-6 left-6 flex items-center gap-2">
                <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Extract
                </span>
                <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium">
                    {stateLabel}
                </span>
                {extract.review_count > 0 && (
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                        Reviewed {extract.review_count}x
                    </span>
                )}
            </div>

            <div className="absolute top-6 right-6 text-sm text-muted-foreground max-w-md truncate">
                From: <span className="font-medium text-foreground">{documentTitle}</span>
                {extract.page_number && <span className="ml-2 opacity-70">Pg. {extract.page_number}</span>}
            </div>

            {/* Extract Container */}
            <div className="w-full max-w-4xl flex flex-col gap-6">
                {/* Actions Bar */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={handleCreateCloze}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                        title="Select text and press C"
                    >
                        <Scissors className="w-4 h-4" />
                        Create Cloze (C)
                    </button>
                    <button
                        onClick={onCreateQA}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                        title="Press Q"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Create Q&A (Q)
                    </button>
                </div>

                {/* Content */}
                <div
                    ref={contentRef}
                    className="bg-card border border-border rounded-2xl p-10 shadow-xl min-h-[300px] max-h-[60vh] overflow-y-auto text-lg leading-relaxed text-foreground whitespace-pre-wrap selection:bg-primary/30 selection:text-primary-foreground relative"
                    dangerouslySetInnerHTML={{ __html: extract.content }}
                />

                {extract.notes && (
                    <div className="bg-muted/50 border border-border/50 rounded-xl p-4 text-sm text-muted-foreground">
                        <div className="font-semibold text-xs uppercase tracking-wider mb-1 opacity-70">Notes</div>
                        {extract.notes}
                    </div>
                )}

                {/* Rating Buttons */}
                <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                        onClick={() => onRate(1)}
                        className="flex-1 py-4 bg-red-500/90 text-white rounded-xl font-medium hover:bg-red-500 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <AlertCircle className="w-5 h-5" />
                        Again
                    </button>
                    <button
                        onClick={() => onRate(2)}
                        className="flex-1 py-4 bg-orange-500/90 text-white rounded-xl font-medium hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Star className="w-5 h-5" />
                        Hard
                    </button>
                    <button
                        onClick={() => onRate(3)}
                        className="flex-1 py-4 bg-blue-500/90 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Good
                    </button>
                    <button
                        onClick={() => onRate(4)}
                        className="flex-1 py-4 bg-green-500/90 text-white rounded-xl font-medium hover:bg-green-500 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Sparkles className="w-5 h-5" />
                        Easy
                    </button>
                </div>

                {/* Keyboard hints */}
                <div className="text-center text-xs text-muted-foreground">
                    Press 1-4 to rate • Select text + C to create Cloze • Q for Q&A
                </div>
            </div>
        </div>
    );
}
