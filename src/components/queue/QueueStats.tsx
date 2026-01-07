import { Clock, TrendingUp, BookOpen, Brain, Pause } from "lucide-react";
import type { QueueStats } from "../../api/queue";

interface QueueStatsDisplayProps {
  stats: QueueStats | null;
  isLoading?: boolean;
}

export function QueueStatsDisplay({ stats, isLoading }: QueueStatsDisplayProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-card border border-border rounded-lg animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-2"></div>
            <div className="h-8 bg-muted rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-muted-foreground">Due Today</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.due_today}</div>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-red-500" />
          <span className="text-sm text-muted-foreground">Overdue</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.overdue}</div>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-muted-foreground">Learning</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.learning_items}</div>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-green-500" />
          <span className="text-sm text-muted-foreground">Review</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.review_items}</div>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Pause className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Suspended</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.suspended}</div>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Total Items</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.total_items}</div>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">New Items</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.new_items}</div>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Est. Time</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.total_estimated_time}m
        </div>
      </div>
    </div>
  );
}
