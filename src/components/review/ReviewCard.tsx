import { LearningItem } from "../../api/review";
import { Brain, FileText } from "lucide-react";

interface ReviewCardProps {
  card: LearningItem;
  showAnswer: boolean;
  onShowAnswer: () => void;
}

export function ReviewCard({ card, showAnswer, onShowAnswer }: ReviewCardProps) {
  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case "cloze":
        return "📝";
      case "qa":
        return "❓";
      case "flashcard":
        return "🎴";
      default:
        return "📚";
    }
  };

  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case "cloze":
        return "Cloze Deletion";
      case "qa":
        return "Question & Answer";
      case "flashcard":
        return "Flashcard";
      default:
        return "Learning Item";
    }
  };

  const renderQuestion = () => {
    if (card.item_type === "cloze" && card.cloze_text) {
      // For cloze cards, hide the clozed portion
      const parts = card.cloze_text.split(/\[\[c(\d+)::(.*?)\]\]/g);
      return (
        <div className="text-lg leading-relaxed text-foreground">
          {parts.map((part, idx) => {
            if (idx % 3 === 1) return null; // Skip the index
            if (idx % 3 === 2) {
              // This is the clozed content
              if (showAnswer) {
                return (
                  <span
                    key={idx}
                    className="bg-primary/20 px-1 rounded font-semibold"
                    dangerouslySetInnerHTML={{ __html: part }}
                  />
                );
              }
              return (
                <span key={idx} className="bg-muted px-2 py-0.5 rounded text-foreground font-bold border border-border/50">
                  [...]
                </span>
              );
            }
            return <span key={idx} dangerouslySetInnerHTML={{ __html: part }} />;
          })}
        </div>
      );
    }

    return (
      <div className="text-base md:text-lg leading-relaxed text-foreground">
        <span dangerouslySetInnerHTML={{ __html: card.question }} />
      </div>
    );
  };

  const renderAnswer = () => {
    if (!showAnswer || !card.answer) return null;

    return (
      <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
        <div className="text-xs md:text-sm uppercase tracking-wide text-foreground/80 mb-2 font-medium">
          Answer
        </div>
        <div className="text-sm md:text-base leading-relaxed text-foreground">
          <span dangerouslySetInnerHTML={{ __html: card.answer }} />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2 md:px-0" role="article" aria-label={`${getItemTypeLabel(card.item_type)} card`}>
      {/* Card Type Badge */}
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <span className="text-xl md:text-2xl" aria-hidden="true">{getItemIcon(card.item_type)}</span>
        <span className="text-xs md:text-sm uppercase tracking-wide text-foreground/80 font-medium">
          {getItemTypeLabel(card.item_type)}
        </span>
        {card.tags.length > 0 && (
          <>
            <span className="text-foreground/60" aria-hidden="true">•</span>
            {card.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-muted/60 text-foreground border border-border/50 rounded"
              >
                {tag}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Card Content with Animation */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm transition-all duration-300">
        {/* Question */}
        <div className="mb-2">
          <div className="text-sm uppercase tracking-wide text-foreground/80 mb-3 font-medium">
            {card.item_type === "cloze" ? "Complete the sentence" : "Question"}
          </div>
          {renderQuestion()}
        </div>

        {/* Answer (shown when revealed) with fade-in animation */}
        {showAnswer && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderAnswer()}

            {/* Card Stats */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    <span>Reviewed {card.review_count}x</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>Interval: {card.interval}d</span>
                  </div>
                </div>
                {card.state === "new" && (
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs">
                    New
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Show Answer Button */}
      {!showAnswer && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onShowAnswer}
            className="px-8 py-3 min-h-[52px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-all hover:scale-105 active:scale-95 font-medium text-lg shadow-md focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-none"
            aria-label="Show answer"
            autoFocus
          >
            Show Answer
            <span className="sr-only">Press space to show</span>
          </button>
        </div>
      )}
    </div>
  );
}
