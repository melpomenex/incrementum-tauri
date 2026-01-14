import { useState, useEffect, useRef } from "react";
import { AlertCircle, Star, CheckCircle, Sparkles, Scissors, MessageSquare, FileText, PencilLine, Loader2 } from "lucide-react";
import type { Extract } from "../../api/extracts";
import { updateExtract } from "../../api/extracts";
import { cn } from "../../utils";

interface ExtractScrollItemProps {
    extract: Extract;
    documentTitle: string;
    onRate: (rating: number) => void;
    onCreateCloze: (selectedText: string, range: [number, number]) => void;
    onCreateQA: () => void;
    onUpdate?: (updates: { content: string; notes?: string }) => void;
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
    onCreateQA,
    onUpdate
}: ExtractScrollItemProps) {
    const [content, setContent] = useState(extract.content);
    const [notes, setNotes] = useState(extract.notes ?? "");
    const [saveStatus, setSaveStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const lastSavedRef = useRef({ content: extract.content, notes: extract.notes ?? "" });
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        setContent(extract.content);
        setNotes(extract.notes ?? "");
        lastSavedRef.current = { content: extract.content, notes: extract.notes ?? "" };
        setSaveStatus("idle");
    }, [extract.id, extract.content, extract.notes]);

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
    }, [onRate, onCreateQA, onCreateCloze]);

    useEffect(() => {
        if (content === lastSavedRef.current.content && notes === lastSavedRef.current.notes) {
            return;
        }

        setSaveStatus("dirty");

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setSaveStatus("saving");
            try {
                await updateExtract({ id: extract.id, content, note: notes });
                if (!isMountedRef.current) return;
                lastSavedRef.current = { content, notes };
                onUpdate?.({ content, notes });
                setSaveStatus("saved");
                if (statusTimeoutRef.current) {
                    clearTimeout(statusTimeoutRef.current);
                }
                statusTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        setSaveStatus("idle");
                    }
                }, 2000);
            } catch (error) {
                if (!isMountedRef.current) return;
                console.error("Failed to save extract edits:", error);
                setSaveStatus("error");
            }
        }, 800);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [content, notes, extract.id, onUpdate]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
        };
    }, []);

    const handleCreateCloze = () => {
        const textarea = contentRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        if (start === end) return;

        const selectedText = textarea.value.slice(start, end).trim();
        if (!selectedText) return;

        onCreateCloze(selectedText, [start, end]);
    };

    const stateLabel = extract.review_count === 0
        ? "New Extract"
        : "Review";

    const renderSaveStatus = () => {
        if (saveStatus === "saving") {
            return (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                </span>
            );
        }
        if (saveStatus === "saved") {
            return (
                <span className="flex items-center gap-2 text-xs text-emerald-500">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Saved
                </span>
            );
        }
        if (saveStatus === "error") {
            return (
                <span className="flex items-center gap-2 text-xs text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Save failed
                </span>
            );
        }
        if (saveStatus === "dirty") {
            return (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <PencilLine className="w-3.5 h-3.5" />
                    Unsaved
                </span>
            );
        }
        return null;
    };

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

            <div className="absolute top-6 right-6 text-sm text-muted-foreground max-w-md flex items-center gap-4">
                <span className="truncate">
                    From: <span className="font-medium text-foreground">{documentTitle}</span>
                    {extract.page_number && <span className="ml-2 opacity-70">Pg. {extract.page_number}</span>}
                </span>
                {renderSaveStatus()}
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

                {/* Content Editor */}
                <div className="bg-card border border-border rounded-2xl shadow-xl min-h-[300px] max-h-[60vh] overflow-y-auto">
                    <textarea
                        ref={contentRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Edit extract content in markdown..."
                        className="w-full min-h-[300px] p-10 bg-transparent text-lg leading-relaxed text-foreground outline-none resize-none"
                    />
                </div>

                {/* Notes Editor */}
                <div className={cn(
                    "bg-muted/50 border border-border/50 rounded-xl p-4",
                    "text-sm text-muted-foreground"
                )}>
                    <div className="font-semibold text-xs uppercase tracking-wider mb-2 opacity-70">Notes</div>
                    <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Add notes for future review..."
                        className="w-full min-h-[90px] bg-transparent text-sm text-foreground outline-none resize-none"
                    />
                </div>

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
