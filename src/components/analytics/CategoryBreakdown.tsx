import { CategoryStats } from "../../api/analytics";
import { FolderOpen, TrendingUp } from "lucide-react";

interface CategoryBreakdownProps {
  categories: CategoryStats[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (categories.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No categories yet</p>
        <p className="text-sm mt-2">Create extracts with categories to see breakdown</p>
      </div>
    );
  }

  const maxCardCount = Math.max(...categories.map((c) => c.card_count), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Categories</h3>
          <p className="text-sm text-muted-foreground">Cards by category</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderOpen className="w-4 h-4" />
          {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const percentage = (category.card_count / maxCardCount) * 100;

          return (
            <div
              key={category.category}
              className="p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {category.category}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {category.card_count} card{category.card_count !== 1 ? "s" : ""}
                  </span>
                </div>

                {category.reviews_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    {category.reviews_count} review{category.reviews_count !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Retention rate */}
              {category.reviews_count > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Retention rate</span>
                  <span
                    className={`font-medium ${
                      category.retention_rate >= 80
                        ? "text-green-500"
                        : category.retention_rate >= 60
                          ? "text-yellow-500"
                          : "text-red-500"
                    }`}
                  >
                    {category.retention_rate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
