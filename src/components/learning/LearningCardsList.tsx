import { useState, useEffect } from "react";
import { Brain, Eye, EyeOff, Trash2, Edit, RefreshCw } from "lucide-react";
import { getLearningItems, type LearningItem, getItemTypeName, getItemStateName } from "../../api/learning-items";
import { cn } from "../../utils";
import { DynamicVirtualList } from "../common/VirtualList";

interface LearningCardsListProps {
  documentId: string;
}

export function LearningCardsList({ documentId }: LearningCardsListProps) {
  const [cards, setCards] = useState<LearningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadCards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getLearningItems(documentId);
        setCards(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cards");
      } finally {
        setIsLoading(false);
      }
    };

    loadCards();
  }, [documentId]);

  const toggleAnswer = (cardId: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const getCardTypeColor = (itemType: LearningItem["item_type"]) => {
    switch (itemType) {
      case "Cloze":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Qa":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Flashcard":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "text-green-500";
    if (difficulty <= 4) return "text-yellow-500";
    return "text-red-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading learning cards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
        Failed to load cards: {error}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No learning cards yet
        </h3>
        <p className="text-muted-foreground">
          Generate cards from your extracts to start spaced repetition learning
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-2xl font-bold text-foreground">
          Learning Cards ({cards.length})
        </h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
            Study Now
          </button>
        </div>
      </div>

      {/* Virtual Scrolled Cards List */}
      <DynamicVirtualList
        items={cards}
        renderItem={(card) => (
          <div className="p-4 mb-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs rounded border",
                    getCardTypeColor(card.item_type)
                  )}
                >
                  {getItemTypeName(card.item_type)}
                </span>
                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                  {getItemStateName(card.state)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title="Edit card"
                >
                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                  title="Delete card"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>

            {/* Question */}
            <div className="mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Question
              </div>
              <p className="text-foreground">{card.question}</p>
            </div>

            {/* Answer */}
            {card.answer && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Answer
                  </div>
                  <button
                    onClick={() => toggleAnswer(card.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showAnswers[card.id] ? (
                      <span className="flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hide
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Show
                      </span>
                    )}
                  </button>
                </div>
                {showAnswers[card.id] ? (
                  <p className="text-foreground p-3 bg-muted rounded-md">
                    {card.answer}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    Answer hidden - click to reveal
                  </p>
                )}
              </div>
            )}

            {/* Stats Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Due: {new Date(card.due_date).toLocaleDateString()}
                </span>
                <span className={cn("font-medium", getDifficultyColor(card.difficulty))}>
                  Difficulty: {card.difficulty}/10
                </span>
                <span>Interval: {card.interval}d</span>
                {card.review_count > 0 && (
                  <span>Reviews: {card.review_count}</span>
                )}
              </div>

              {card.ease_factor !== 2.5 && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  EF: {card.ease_factor.toFixed(2)}
                </span>
              )}
            </div>

            {/* Tags */}
            {card.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {card.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        className="flex-1"
        estimateSize={280}
      />
    </div>
  );
}
