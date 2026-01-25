import { useState, useEffect } from "react";
import {
    Inbox,
    Sparkles,
    FileText,
    Clock,
    Brain,
    Target,
    MessageSquare,
    Loader2,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    BookOpen,
    Zap,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Trash2,
    Eye,
} from "lucide-react";
import { getExtracts, deleteExtract, type Extract } from "../../api/extracts";
import { summarizeContent, extractKeyPoints, generateQuestions } from "../../api/ai";
import { cn } from "../../utils";
import { RichContentRenderer } from "../common/RichContentRenderer";

interface ExtractInboxProps {
    onSelectExtract?: (extract: Extract) => void;
}

interface AIAnalysis {
    summary?: string;
    keyPoints?: string[];
    questions?: string[];
    loading?: boolean;
    error?: string;
}

/**
 * ExtractInbox - A beautiful component for viewing browser-sent extracts
 * with AI-powered features like summaries, key points, and questions.
 */
export function ExtractInbox({ onSelectExtract }: ExtractInboxProps) {
    const [extracts, setExtracts] = useState<Extract[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<Record<string, AIAnalysis>>({});

    useEffect(() => {
        loadExtracts();
    }, []);

    const loadExtracts = async () => {
        setLoading(true);
        try {
            // Get recent extracts (those without document_id are from browser extension)
            const allExtracts = await getExtracts("");
            // Sort by most recent first
            const sorted = allExtracts.sort(
                (a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
            );
            setExtracts(sorted.slice(0, 50)); // Show last 50
        } catch (error) {
            console.error("Failed to load extracts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (extract: Extract) => {
        const id = extract.id;
        setAiAnalysis((prev) => ({
            ...prev,
            [id]: { loading: true },
        }));

        try {
            // Run AI analysis in parallel
            const [summary, keyPoints, questions] = await Promise.all([
                summarizeContent(extract.content, 150).catch(() => null),
                extractKeyPoints(extract.content, 5).catch(() => null),
                generateQuestions(extract.content, 3).catch(() => null),
            ]);

            setAiAnalysis((prev) => ({
                ...prev,
                [id]: {
                    summary: summary || undefined,
                    keyPoints: keyPoints || undefined,
                    questions: questions || undefined,
                    loading: false,
                },
            }));
        } catch (error) {
            setAiAnalysis((prev) => ({
                ...prev,
                [id]: {
                    loading: false,
                    error: "Failed to analyze content",
                },
            }));
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteExtract(id);
            setExtracts((prev) => prev.filter((e) => e.id !== id));
        } catch (error) {
            console.error("Failed to delete extract:", error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return "Just now";
        if (hours < 24) return `${hours}h ago`;
        if (hours < 48) return "Yesterday";
        return date.toLocaleDateString();
    };

    const getWordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
    const getReadingTime = (text: string) => Math.ceil(getWordCount(text) / 200);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (extracts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                <Inbox className="w-16 h-16 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No extracts yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    Use the browser extension to save text from web pages. They'll appear here for AI-powered analysis.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/10">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Inbox className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Extract Inbox</h2>
                        <p className="text-sm text-muted-foreground">{extracts.length} extracts from browser</p>
                    </div>
                </div>
                <button
                    onClick={loadExtracts}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Extract List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {extracts.map((extract) => {
                    const analysis = aiAnalysis[extract.id];
                    const isExpanded = expandedId === extract.id;
                    const wordCount = getWordCount(extract.content);
                    const readingTime = getReadingTime(extract.content);

                    return (
                        <div
                            key={extract.id}
                            className={cn(
                                "bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-300",
                                "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                                selectedId === extract.id && "ring-2 ring-primary/50"
                            )}
                        >
                            {/* Extract Header */}
                            <div
                                className="p-5 cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : extract.id)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Title / Source */}
                                        {extract.page_title && (
                                            <h3 className="font-semibold text-foreground truncate mb-1">
                                                {extract.page_title}
                                            </h3>
                                        )}
                                        {/* Content Preview */}
                                        {!isExpanded && (
                                            <div className="flex items-start gap-2">
                                                {extract.html_content && (
                                                    <Eye className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" title="Rich content available" />
                                                )}
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {extract.content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedId(isExpanded ? null : extract.id);
                                            }}
                                            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(extract.date_created)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {wordCount} words
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        {readingTime} min read
                                    </span>
                                    {extract.tags?.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Target className="w-3.5 h-3.5" />
                                            {extract.tags.join(", ")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-border/50">
                                    {/* Full Content with Rich HTML support */}
                                    <div className="p-5 bg-muted/20">
                                        <RichContentRenderer
                                            content={extract.content}
                                            htmlContent={extract.html_content}
                                            sourceUrl={extract.source_url}
                                            mode="full"
                                            maxHeight="300px"
                                            className="text-sm leading-relaxed"
                                        />
                                    </div>

                                    {/* AI Analysis Section */}
                                    <div className="p-5 border-t border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
                                        {!analysis ? (
                                            <button
                                                onClick={() => handleAnalyze(extract)}
                                                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                                            >
                                                <Sparkles className="w-5 h-5" />
                                                Analyze with AI
                                            </button>
                                        ) : analysis.loading ? (
                                            <div className="flex items-center justify-center py-8 gap-3">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                                <span className="text-sm text-muted-foreground">Analyzing content...</span>
                                            </div>
                                        ) : analysis.error ? (
                                            <div className="flex items-center justify-center py-4 gap-2 text-destructive">
                                                <AlertCircle className="w-5 h-5" />
                                                <span className="text-sm">{analysis.error}</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                {/* Summary */}
                                                {analysis.summary && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Brain className="w-4 h-4 text-primary" />
                                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                                Summary
                                                            </span>
                                                        </div>
                                                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-sm text-foreground">
                                                            {analysis.summary}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Key Points */}
                                                {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Target className="w-4 h-4 text-green-500" />
                                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                                Key Points
                                                            </span>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {analysis.keyPoints.map((point, i) => (
                                                                <li
                                                                    key={i}
                                                                    className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm"
                                                                >
                                                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                                    <span>{point}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Questions */}
                                                {analysis.questions && analysis.questions.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <MessageSquare className="w-4 h-4 text-purple-500" />
                                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                                Questions to Explore
                                                            </span>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {analysis.questions.map((q, i) => (
                                                                <li
                                                                    key={i}
                                                                    className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm"
                                                                >
                                                                    {q}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 p-4 border-t border-border/30 bg-muted/10">
                                        <button
                                            onClick={() => onSelectExtract?.(extract)}
                                            className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                        >
                                            <Zap className="w-4 h-4" />
                                            Create Flashcards
                                        </button>
                                        <button
                                            onClick={() => handleDelete(extract.id)}
                                            className="p-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
