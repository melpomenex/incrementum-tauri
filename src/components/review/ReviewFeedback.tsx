/**
 * Review Feedback Component
 * Shows celebration animations and feedback for review milestones
 */

import { useEffect, useState } from "react";
import { Trophy, Star, Zap, Flame, PartyPopper, X } from "lucide-react";

interface ReviewFeedbackProps {
  type: "streak" | "milestone" | "complete" | "mastered" | null;
  value?: number;
  onClose?: () => void;
}

interface FeedbackConfig {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  bgColor: string;
}

const feedbackConfigs: Record<string, FeedbackConfig> = {
  streak: {
    icon: <Flame className="w-12 h-12" />,
    title: "Review Streak!",
    message: "You're on fire! Keep it up!",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/20",
  },
  milestone: {
    icon: <Trophy className="w-12 h-12" />,
    title: "Milestone Reached!",
    message: "You've hit a new milestone!",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
  },
  complete: {
    icon: <PartyPopper className="w-12 h-12" />,
    title: "Session Complete!",
    message: "Great job! You've finished your reviews.",
    color: "text-green-500",
    bgColor: "bg-green-500/10 border-green-500/20",
  },
  mastered: {
    icon: <Star className="w-12 h-12" />,
    title: "Card Mastered!",
    message: "This card has reached maturity!",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
};

export function ReviewFeedback({ type, value, onClose }: ReviewFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (type) {
      setIsVisible(true);
      setIsExiting(false);
      
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [type]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!type || !isVisible) return null;

  const config = feedbackConfigs[type];

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center pointer-events-none
        transition-opacity duration-300
        ${isExiting ? "opacity-0" : "opacity-100"}
      `}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />

      {/* Content */}
      <div
        className={`
          relative pointer-events-auto
          ${config.bgColor} border-2 rounded-2xl p-8 shadow-2xl
          transform transition-all duration-300
          ${isExiting ? "scale-95 translate-y-4" : "scale-100 translate-y-0"}
          animate-bounce-in
        `}
        role="alert"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 min-w-[32px] min-h-[32px] rounded-full hover:bg-black/5 transition-colors focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
          aria-label="Dismiss feedback"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className={`flex justify-center mb-4 ${config.color} animate-pulse`}>
          {config.icon}
        </div>

        {/* Value display (if applicable) */}
        {value && (
          <div className={`text-4xl font-bold text-center mb-2 ${config.color}`}>
            {value}
          </div>
        )}

        {/* Title */}
        <h3 className={`text-xl font-bold text-center mb-2 ${config.color}`}>
          {config.title}
        </h3>

        {/* Message */}
        <p className="text-foreground text-center">
          {config.message}
        </p>

        {/* Progress bar for auto-dismiss */}
        <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${config.color.replace("text-", "bg-")} animate-shrink`}
            style={{ animationDuration: "3s" }}
          />
        </div>
      </div>
    </div>
  );
}

// Hook to track and trigger review feedback
export function useReviewFeedback() {
  const [feedback, setFeedback] = useState<{
    type: ReviewFeedbackProps["type"];
    value?: number;
  }>({ type: null });

  const showFeedback = (type: ReviewFeedbackProps["type"], value?: number) => {
    setFeedback({ type, value });
  };

  const hideFeedback = () => {
    setFeedback({ type: null });
  };

  return {
    feedback,
    showFeedback,
    hideFeedback,
    FeedbackComponent: (
      <ReviewFeedback
        type={feedback.type}
        value={feedback.value}
        onClose={hideFeedback}
      />
    ),
  };
}

// CSS animations
const animations = `
  @keyframes bounce-in {
    0% {
      opacity: 0;
      transform: scale(0.3) translateY(-20px);
    }
    50% {
      opacity: 1;
      transform: scale(1.05) translateY(0);
    }
    70% {
      transform: scale(0.95);
    }
    100% {
      transform: scale(1);
    }
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.5s ease-out;
  }
  
  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  
  .animate-shrink {
    animation: shrink linear forwards;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleId = "review-feedback-animations";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = animations;
    document.head.appendChild(style);
  }
}

export default ReviewFeedback;
