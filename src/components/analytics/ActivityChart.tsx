import { ActivityDay } from "../../api/analytics";
import { BarChart3 } from "lucide-react";

interface ActivityChartProps {
  data: ActivityDay[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No activity data yet</p>
      </div>
    );
  }

  // Find max value for scaling
  const maxReviews = Math.max(...data.map((d) => d.reviews_count), 1);

  // Get last 14 days for display
  const displayData = data.slice(-14);

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const getBarHeight = (value: number) => {
    const percentage = (value / maxReviews) * 100;
    return Math.max(percentage, 4); // Minimum 4% height for visibility
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Activity</h3>
          <p className="text-sm text-muted-foreground">Reviews per day</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="w-4 h-4" />
          Last 14 days
        </div>
      </div>

      <div className="flex items-end gap-2 h-40">
        {displayData.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            {/* Bar */}
            <div className="relative w-full flex items-end justify-center h-32">
              <div
                className="w-full max-w-[40px] bg-primary rounded-t-md transition-all hover:bg-primary/80"
                style={{ height: `${getBarHeight(day.reviews_count)}%` }}
                title={`${day.reviews_count} reviews`}
              />
            </div>

            {/* Day label */}
            <div className="text-xs text-muted-foreground text-center">
              {getDayOfWeek(day.date)}
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">
            {displayData.reduce((sum, d) => sum + d.reviews_count, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total Reviews</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">
            {Math.round(
              displayData.reduce((sum, d) => sum + d.reviews_count, 0) /
                displayData.length
            )}
          </p>
          <p className="text-xs text-muted-foreground">Avg/Day</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">
            {Math.max(...displayData.map((d) => d.reviews_count))}
          </p>
          <p className="text-xs text-muted-foreground">Best Day</p>
        </div>
      </div>
    </div>
  );
}
