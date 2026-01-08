import { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  Brain,
  Target,
  Award,
  BarChart3,
  Activity,
  Clock,
} from "lucide-react";

interface AnalyticsData {
  // Today's stats
  cardsReviewed: number;
  timeSpent: number; // in minutes
  accuracy: number; // percentage

  // Streaks
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;

  // Performance metrics
  averageRetention: number;
  averageInterval: number; // in days
  totalCards: number;
  activeCards: number;

  // Weekly data (last 7 days)
  weeklyData: {
    date: string;
    reviews: number;
    accuracy: number;
    timeSpent: number;
  }[];

  // Difficulty distribution
  difficultyDistribution: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };

  // Goals
  dailyGoal: number;
  dailyGoalProgress: number;
  weeklyGoal: number;
  weeklyGoalProgress: number;
}

export function LearningAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "all">("week");

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call
      // For now, use mock data
      const mockData: AnalyticsData = {
        cardsReviewed: 45,
        timeSpent: 32,
        accuracy: 87.5,
        currentStreak: 12,
        longestStreak: 28,
        totalReviews: 1247,
        averageRetention: 0.91,
        averageInterval: 14.3,
        totalCards: 842,
        activeCards: 312,
        weeklyData: [
          { date: "Mon", reviews: 52, accuracy: 85.5, timeSpent: 38 },
          { date: "Tue", reviews: 48, accuracy: 89.2, timeSpent: 35 },
          { date: "Wed", reviews: 0, accuracy: 0, timeSpent: 0 },
          { date: "Thu", reviews: 61, accuracy: 91.3, timeSpent: 42 },
          { date: "Fri", reviews: 55, accuracy: 88.7, timeSpent: 40 },
          { date: "Sat", reviews: 43, accuracy: 86.2, timeSpent: 31 },
          { date: "Sun", reviews: 45, accuracy: 87.5, timeSpent: 32 },
        ],
        difficultyDistribution: {
          new: 23,
          learning: 18,
          review: 256,
          relearning: 15,
        },
        dailyGoal: 50,
        dailyGoalProgress: 45,
        weeklyGoal: 300,
        weeklyGoalProgress: 304,
      };
      setData(mockData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Learning Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Track your progress and performance
          </p>
        </div>
        <div className="flex gap-2">
          {(["day", "week", "month", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                timeRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cards Reviewed */}
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Cards Reviewed</span>
            <Brain className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">{data.cardsReviewed}</div>
          <div className="text-xs text-muted-foreground mt-1">Today</div>
        </div>

        {/* Accuracy */}
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Accuracy</span>
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{data.accuracy.toFixed(1)}%</div>
          <div className="text-xs text-green-500 mt-1">
            +2.3% from yesterday
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Current Streak</span>
            <Award className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold">{data.currentStreak}</div>
          <div className="text-xs text-muted-foreground mt-1">days</div>
        </div>

        {/* Time Spent */}
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Time Spent</span>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{data.timeSpent}m</div>
          <div className="text-xs text-muted-foreground mt-1">Today</div>
        </div>
      </div>

      {/* Goals Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Goal */}
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="font-semibold">Daily Goal</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.dailyGoalProgress} / {data.dailyGoal} cards
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  (data.dailyGoalProgress / data.dailyGoal) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {data.dailyGoal - data.dailyGoalProgress > 0
              ? `${data.dailyGoal - data.dailyGoalProgress} more cards to reach goal`
              : "Daily goal reached! 🎉"}
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <span className="font-semibold">Weekly Goal</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.weeklyGoalProgress} / {data.weeklyGoal} cards
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  (data.weeklyGoalProgress / data.weeklyGoal) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {data.weeklyGoalProgress >= data.weeklyGoal
              ? "Weekly goal reached! 🎉"
              : `${Math.ceil((data.weeklyGoal - data.weeklyGoalProgress) / 7)} cards/day average needed`}
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Weekly Activity</h3>
        </div>
        <div className="flex items-end justify-between gap-2 h-48">
          {data.weeklyData.map((day, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <div className="relative w-full">
                {/* Reviews bar */}
                <div
                  className="absolute bottom-0 w-full bg-blue-500 rounded-t transition-all group-hover:bg-blue-600"
                  style={{
                    height: `${(day.reviews / 80) * 100}%`,
                    minHeight: day.reviews > 0 ? "4px" : "0",
                  }}
                />
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs whitespace-nowrap z-10">
                  <div>{day.date}</div>
                  <div>{day.reviews} cards</div>
                  <div>{day.accuracy.toFixed(1)}% accuracy</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{day.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Card Distribution</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {data.difficultyDistribution.new}
            </div>
            <div className="text-sm text-muted-foreground">New</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">
              {data.difficultyDistribution.learning}
            </div>
            <div className="text-sm text-muted-foreground">Learning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {data.difficultyDistribution.review}
            </div>
            <div className="text-sm text-muted-foreground">Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {data.difficultyDistribution.relearning}
            </div>
            <div className="text-sm text-muted-foreground">Relearning</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-6 border">
          <div className="text-sm text-muted-foreground mb-2">
            Average Retention
          </div>
          <div className="text-2xl font-bold">
            {(data.averageRetention * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-green-500 mt-1">Excellent</div>
        </div>
        <div className="bg-card rounded-lg p-6 border">
          <div className="text-sm text-muted-foreground mb-2">
            Average Interval
          </div>
          <div className="text-2xl font-bold">
            {data.averageInterval.toFixed(1)} days
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Growing steadily
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 border">
          <div className="text-sm text-muted-foreground mb-2">Total Cards</div>
          <div className="text-2xl font-bold">{data.totalCards}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.activeCards} active
          </div>
        </div>
      </div>
    </div>
  );
}
