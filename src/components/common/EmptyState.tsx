/**
 * Empty state component
 * Used consistently across views when there's no data to display
 */

import { ReactNode } from "react";
import { FileText, BookOpen, Search, Inbox, BarChart3, Zap, FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: "documents" | "queue" | "search" | "inbox" | "analytics" | "review" | "folder" | ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

const iconMap = {
  documents: FileText,
  queue: BookOpen,
  search: Search,
  inbox: Inbox,
  analytics: BarChart3,
  review: Zap,
  folder: FolderOpen,
};

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  const IconComponent = typeof icon === "string" ? iconMap[icon] : null;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12">
      {/* Icon */}
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        {IconComponent ? (
          <IconComponent className="w-10 h-10 text-muted-foreground" />
        ) : (
          <div className="w-10 h-10 flex items-center justify-center">{icon}</div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>

      {/* Custom content */}
      {children}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="px-6 py-2.5 min-h-[44px] bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-2.5 min-h-[44px] text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios

export function EmptyDocuments({ onImport }: { onImport?: () => void }) {
  return (
    <EmptyState
      icon="documents"
      title="No documents yet"
      description="Start building your knowledge library by importing your first document. We support PDFs, EPUBs, YouTube videos, and more."
      action={
        onImport
          ? {
              label: "Import Document",
              onClick: onImport,
            }
          : undefined
      }
    />
  );
}

export function EmptyQueue({ onStartReview }: { onStartReview?: () => void }) {
  return (
    <EmptyState
      icon="queue"
      title="Your queue is empty"
      description="You're all caught up! Create some learning items from your documents to start reviewing."
      action={
        onStartReview
          ? {
              label: "Start Review",
              onClick: onStartReview,
            }
          : undefined
      }
      secondaryAction={{
        label: "Go to Documents",
        onClick: () => window.dispatchEvent(new CustomEvent("navigate", { detail: "/documents" })),
      }}
    />
  );
}

export function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms or filters.`}
      action={{
        label: "Clear Search",
        onClick: onClear,
      }}
    />
  );
}

export function EmptyAnalytics({ onImport }: { onImport?: () => void }) {
  return (
    <EmptyState
      icon="analytics"
      title="No data to analyze"
      description="Start learning and reviewing to see your progress statistics. Import documents and create flashcards to begin tracking your journey."
      action={
        onImport
          ? {
              label: "Import Your First Document",
              onClick: onImport,
            }
          : undefined
      }
    />
  );
}

export function EmptyReview({ onGoToQueue }: { onGoToQueue?: () => void }) {
  return (
    <EmptyState
      icon="review"
      title="Nothing to review right now"
      description="You've completed all your reviews for today! Come back tomorrow or add more learning items to your queue."
      action={
        onGoToQueue
          ? {
              label: "View Queue",
              onClick: onGoToQueue,
            }
          : undefined
      }
      secondaryAction={{
        label: "Import More Content",
        onClick: () => window.dispatchEvent(new CustomEvent("import-document")),
      }}
    />
  );
}

export function EmptyExtracts({ onOpenDocument }: { onOpenDocument?: () => void }) {
  return (
    <EmptyState
      icon="folder"
      title="No extracts yet"
      description="Select text in any document to create extracts. These will become flashcards for your review sessions."
      action={
        onOpenDocument
          ? {
              label: "Open a Document",
              onClick: onOpenDocument,
            }
          : undefined
      }
    />
  );
}

export default EmptyState;
