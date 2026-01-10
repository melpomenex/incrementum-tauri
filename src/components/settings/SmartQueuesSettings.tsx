/**
 * Smart Queues Settings
 * Configure intelligent queue management and auto-refresh behavior
 */

import { RefreshCw, Filter, Brain } from "lucide-react";

interface SmartQueuesSettingsProps {
  settings: {
    autoRefresh: boolean;
    refreshInterval: number;
    mode: 'normal' | 'filtered' | 'intelligent';
  };
  onUpdateSettings: (updates: Partial<SmartQueuesSettingsProps["settings"]>) => void;
}

const QUEUE_MODES = [
  {
    value: 'normal' as const,
    label: 'Normal',
    description: 'Standard queue showing all due items in order',
  },
  {
    value: 'filtered' as const,
    label: 'Filtered',
    description: 'Queue filtered by tags, categories, or priority',
  },
  {
    value: 'intelligent' as const,
    label: 'Intelligent',
    description: 'AI-powered queue optimization based on performance',
  },
];

export function SmartQueuesSettings({
  settings,
  onUpdateSettings,
}: SmartQueuesSettingsProps) {
  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Smart Queues</h3>
          <p className="text-sm text-muted-foreground">
            Configure intelligent learning queue behavior
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Auto-Refresh Toggle */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Auto-Refresh</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Automatically refresh the queue when items become due
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoRefresh: !settings.autoRefresh })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoRefresh ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.autoRefresh ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Refresh Interval */}
        {settings.autoRefresh && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Refresh Interval</div>
                <div className="text-xs text-muted-foreground">
                  How often to check for new due items
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="15"
                max="300"
                step="15"
                value={settings.refreshInterval}
                onChange={(e) => onUpdateSettings({ refreshInterval: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <div className="w-20 text-right">
                <span className="text-sm font-medium text-foreground">
                  {settings.refreshInterval < 60
                    ? `${settings.refreshInterval}s`
                    : `${Math.round(settings.refreshInterval / 60)}m`}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>15 sec</span>
              <span>5 min</span>
            </div>
          </div>
        )}

        {/* Queue Mode */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Queue Mode</div>
              <div className="text-xs text-muted-foreground">
                Select how items are organized in your learning queue
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {QUEUE_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => onUpdateSettings({ mode: mode.value })}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  settings.mode === mode.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {mode.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {mode.description}
                    </div>
                  </div>
                  {settings.mode === mode.value && (
                    <div className="w-4 h-4 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Descriptions */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-primary">Queue Mode Details:</p>
          <ul className="text-sm text-primary space-y-2">
            <li>
              <strong>Normal:</strong> Shows all items in their scheduled order. Best for focused review sessions.
            </li>
            <li>
              <strong>Filtered:</strong> Apply filters like tags, categories, or priority ranges. Useful for targeted study.
            </li>
            <li>
              <strong>Intelligent:</strong> Uses AI to optimize queue order based on your performance patterns and learning goals.
            </li>
          </ul>
        </div>

        {/* Performance Note */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> For best performance, use auto-refresh with intervals of 30 seconds or more.
            Shorter intervals may impact battery life on portable devices.
          </p>
        </div>
      </div>
    </div>
  );
}
