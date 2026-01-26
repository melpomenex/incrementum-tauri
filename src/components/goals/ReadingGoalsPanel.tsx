/**
 * Reading Goals Panel
 * Displays current reading goals, progress, and streaks
 */

import { useState, useEffect } from 'react';
import {
  Target,
  Flame,
  Trophy,
  Plus,
  Edit,
  CheckCircle2,
  Circle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  getActiveReadingGoal,
  getReadingStreak,
  getAchievements,
  createReadingGoal,
  updateReadingGoal,
  type ReadingGoal,
  type ReadingStreak,
  type Achievement,
  type GoalType,
  getGoalLabel,
  getGoalUnit,
  formatStreakDays,
  getStreakMilestone,
  getStreakColor,
} from '../../api/readingGoals';

interface ReadingGoalsPanelProps {
  className?: string;
}

export function ReadingGoalsPanel({ className = '' }: ReadingGoalsPanelProps) {
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [streak, setStreak] = useState<ReadingStreak | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newGoalType, setNewGoalType] = useState<GoalType>('daily_minutes');
  const [newTargetValue, setNewTargetValue] = useState(30);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalData, streakData, achievementsData] = await Promise.all([
        getActiveReadingGoal(),
        getReadingStreak(),
        getAchievements(),
      ]);
      setGoal(goalData);
      setStreak(streakData);
      setAchievements(achievementsData);
    } catch (error) {
      console.error('Failed to load goals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      const newGoal = await createReadingGoal(newGoalType, newTargetValue);
      setGoal(newGoal);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleUpdateGoal = async (targetValue: number, isActive: boolean) => {
    if (!goal) return;
    try {
      const updated = await updateReadingGoal(goal.id, targetValue, isActive);
      setGoal(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 bg-card border border-border rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-muted rounded mb-2"></div>
          <div className="h-2 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const milestone = streak ? getStreakMilestone(streak.currentStreak) : null;
  const streakColor = streak ? getStreakColor(streak.currentStreak) : 'text-gray-500';

  return (
    <div className={`p-4 bg-card border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Reading Goals</h3>
        </div>
        {!goal && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="Set a reading goal"
          >
            <Plus className="w-4 h-4 text-foreground" />
          </button>
        )}
        {goal && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="Edit goal"
          >
            <Edit className="w-4 h-4 text-foreground" />
          </button>
        )}
      </div>

      {/* Streak Display */}
      {streak && streak.currentStreak > 0 && (
        <div className={`mb-4 p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-200 dark:border-orange-800 rounded-lg`}>
          <div className="flex items-center gap-3">
            <div className={`text-3xl ${streakColor}`}>
              {milestone?.icon || <Flame className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {streak.currentStreak}
                </span>
                <span className="text-sm text-foreground-secondary">
                  {formatStreakDays(streak.currentStreak)}
                </span>
              </div>
              {milestone && (
                <div className="text-xs text-muted-foreground">
                  {milestone.label}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-foreground-secondary">Best</div>
              <div className="text-sm font-semibold text-foreground">
                {streak.longestStreak} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Display */}
      {isEditing ? (
        <GoalEditor
          goalType={newGoalType}
          targetValue={newTargetValue}
          existingGoal={goal}
          onGoalTypeChange={setNewGoalType}
          onTargetValueChange={setNewTargetValue}
          onSave={goal ? (v, a) => handleUpdateGoal(v, a) : () => handleCreateGoal()}
          onCancel={() => {
            setIsEditing(false);
            if (goal) {
              setNewGoalType(goal.goalType);
              setNewTargetValue(goal.targetValue);
            }
          }}
        />
      ) : goal ? (
        <GoalDisplay goal={goal} />
      ) : (
        <div className="text-center py-6">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-foreground-secondary">
            Set a daily reading goal to build a habit
          </p>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-foreground">
              Recent Achievements
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {achievements.slice(0, 4).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-full text-xs"
                title={achievement.description}
              >
                <span>{achievement.icon}</span>
                <span className="text-foreground">{achievement.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface GoalDisplayProps {
  goal: ReadingGoal;
}

function GoalDisplay({ goal }: GoalDisplayProps) {
  const label = getGoalLabel(goal.goalType);
  const unit = getGoalUnit(goal.goalType);

  // TODO: Fetch actual progress from API
  const currentProgress = 0;
  const progressPercent = goal.targetValue > 0 ? (currentProgress / goal.targetValue) * 100 : 0;
  const isCompleted = currentProgress >= goal.targetValue;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-foreground-secondary">
            Goal: {goal.targetValue} {unit}/day
          </div>
        </div>
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-foreground-secondary">Progress</span>
          <span className="text-foreground">
            {currentProgress} / {goal.targetValue} {unit}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-green-500'
                : 'bg-primary'
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-foreground-secondary">
          <TrendingUp className="w-3 h-3" />
          <span>Weekly average coming soon</span>
        </div>
      </div>
    </div>
  );
}

interface GoalEditorProps {
  goalType: GoalType;
  targetValue: number;
  existingGoal: ReadingGoal | null;
  onGoalTypeChange: (type: GoalType) => void;
  onTargetValueChange: (value: number) => void;
  onSave: (value: number, isActive: boolean) => void;
  onCancel: () => void;
}

function GoalEditor({
  goalType,
  targetValue,
  existingGoal,
  onGoalTypeChange,
  onTargetValueChange,
  onSave,
  onCancel,
}: GoalEditorProps) {
  const handleSave = () => {
    if (targetValue > 0) {
      onSave(targetValue, true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Goal Type Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Goal Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['daily_minutes', 'Daily Minutes'],
            ['daily_pages', 'Daily Pages'],
            ['weekly_minutes', 'Weekly Minutes'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onGoalTypeChange(value as GoalType)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                goalType === value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Target Value */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Target ({getGoalUnit(goalType)})
        </label>
        <input
          type="number"
          min="1"
          max="1000"
          value={targetValue}
          onChange={(e) => onTargetValueChange(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={targetValue <= 0}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {existingGoal ? 'Update Goal' : 'Set Goal'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
