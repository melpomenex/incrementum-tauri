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

  const renderQuestion = () => {
    if (card.item_type === "cloze" && card.cloze_text) {
      // For cloze cards, hide the clozed portion
      const parts = card.cloze_text.split(/\[\[c(\d+)::(.*?)\]\]/g);
      return (
        <div className="text-lg leading-relaxed">
          {parts.map((part, idx) => {
            if (idx % 3 === 1) return null; // Skip the index
            if (idx % 3 === 2) {
              // This is the clozed content
              if (showAnswer) {
                return (
                  <span key={idx} className="bg-primary/20 px-1 rounded font-semibold">
                    {part}
                  </span>
                );
              }
              return (
                <span key={idx} className="bg-primary/30 px-2 py-0.5 rounded text-primary font-bold">
                  [...]
                </span>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </div>
      );
    }

    return (
      <div className="text-lg leading-relaxed">
        {card.question}
      </div>
    );
  };

  const renderAnswer = () => {
    if (!showAnswer || !card.answer) return null;

    return (
      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-sm uppercase tracking-wide text-muted-foreground mb-2 font-medium">
          Answer
        </div>
        <div className="text-base leading-relaxed text-foreground">
          {card.answer}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Type Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{getItemIcon(card.item_type)}</span>
        <span className="text-sm uppercase tracking-wide text-muted-foreground font-medium">
          {card.item_type}
        </span>
        {card.tags.length > 0 && (
          <>
            <span className="text-muted-foreground">•</span>
            {card.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
              >
                {tag}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Card Content */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        {/* Question */}
        <div className="mb-2">
          <div className="text-sm uppercase tracking-wide text-muted-foreground mb-3 font-medium">
            {card.item_type === "cloze" ? "Complete the sentence" : "Question"}
          </div>
          {renderQuestion()}
        </div>

        {/* Answer (shown when revealed) */}
        {renderAnswer()}

        {/* Card Stats (shown when answer is revealed) */}
        {showAnswer && (
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
        )}
      </div>

      {/* Show Answer Button */}
      {!showAnswer && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onShowAnswer}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-lg shadow-md"
          >
            Show Answer
          </button>
        </div>
      )}
    </div>
  );
}
