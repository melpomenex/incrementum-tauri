import { useSettingsStore } from "../../stores/settingsStore";

export function LearningSettings() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Algorithm Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Algorithm Selection</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="algorithm" className="block text-sm font-medium text-foreground mb-2">
              Spaced Repetition Algorithm
            </label>
            <select
              id="algorithm"
              value={settings.learning.algorithm}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, algorithm: e.target.value as any },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="fsrs">FSRS-5 (Recommended)</option>
              <option value="sm2">SuperMemo 2 (SM-2)</option>
              <option value="sm5">SuperMemo 5 (SM-5)</option>
              <option value="sm8">SuperMemo 8 (SM-8)</option>
              <option value="sm15">SuperMemo 15 (SM-15)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              FSRS-5 provides optimal retention with fewer reviews
            </p>
          </div>

          {settings.learning.algorithm === "fsrs" && (
            <div>
              <label htmlFor="fsrs-retention" className="block text-sm font-medium text-foreground mb-2">
                Desired Retention: {Math.round(settings.learning.fsrsParams.desiredRetention * 100)}%
              </label>
              <input
                type="range"
                id="fsrs-retention"
                min="70"
                max="99"
                value={settings.learning.fsrsParams.desiredRetention * 100}
                onChange={(e) =>
                  updateSettings({
                    learning: {
                      ...settings.learning,
                      fsrsParams: {
                        ...settings.learning.fsrsParams,
                        desiredRetention: parseInt(e.target.value) / 100,
                      },
                    },
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher retention = more frequent reviews
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">New Cards</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="newCardsPerDay" className="block text-sm font-medium text-foreground mb-2">
              New Cards per Day
            </label>
            <input
              type="number"
              id="newCardsPerDay"
              min="0"
              max="100"
              value={settings.learning.newCardsPerDay}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, newCardsPerDay: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
          </div>

          <div>
            <label htmlFor="initialInterval" className="block text-sm font-medium text-foreground mb-2">
              Initial Interval (days)
            </label>
            <input
              type="number"
              id="initialInterval"
              min="0"
              max="30"
              value={settings.learning.initialInterval}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, initialInterval: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Reviews</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="reviewsPerDay" className="block text-sm font-medium text-foreground mb-2">
              Reviews per Day Limit
            </label>
            <input
              type="number"
              id="reviewsPerDay"
              min="0"
              max="1000"
              value={settings.learning.reviewsPerDay}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, reviewsPerDay: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set to 0 for unlimited reviews
            </p>
          </div>

          <div>
            <label htmlFor="maxReviewTime" className="block text-sm font-medium text-foreground mb-2">
              Max Review Time per Card (seconds)
            </label>
            <input
              type="number"
              id="maxReviewTime"
              min="5"
              max="300"
              value={settings.learning.maxReviewTime}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, maxReviewTime: parseInt(e.target.value) || 60 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Lapses */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Lapses (Forgotten Cards)</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="lapseSteps" className="block text-sm font-medium text-foreground mb-2">
              Lapse Steps (minutes)
            </label>
            <input
              type="text"
              id="lapseSteps"
              value={settings.learning.lapseSteps.join(", ")}
              onChange={(e) =>
                updateSettings({
                  learning: {
                    ...settings.learning,
                    lapseSteps: e.target.value.split(",").map((s) => parseInt(s.trim()) || 10),
                  },
                })
              }
              placeholder="10, 20, 30"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated values in minutes (e.g., "10, 20, 30")
            </p>
          </div>

          <div>
            <label htmlFor="lapseInterval" className="block text-sm font-medium text-foreground mb-2">
              Relearning Interval (days)
            </label>
            <input
              type="number"
              id="lapseInterval"
              min="1"
              max="30"
              value={settings.learning.lapseInterval}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, lapseInterval: parseInt(e.target.value) || 1 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Graduated Interval */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Graduated Interval</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="graduatingInterval" className="block text-sm font-medium text-foreground mb-2">
              Graduating Interval (days)
            </label>
            <input
              type="number"
              id="graduatingInterval"
              min="1"
              max="30"
              value={settings.learning.graduatingInterval}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, graduatingInterval: parseInt(e.target.value) || 1 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Interval at which a card graduates from learning to review
            </p>
          </div>

          <div>
            <label htmlFor="easyInterval" className="block text-sm font-medium text-foreground mb-2">
              Easy Interval (days)
            </label>
            <input
              type="number"
              id="easyInterval"
              min="1"
              max="60"
              value={settings.learning.easyInterval}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, easyInterval: parseInt(e.target.value) || 4 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Interval when "Easy" is pressed on new card
            </p>
          </div>
        </div>
      </div>

      {/* Leech Threshold */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Leech Cards</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="leechThreshold" className="block text-sm font-medium text-foreground mb-2">
              Leech Threshold (lapses)
            </label>
            <input
              type="number"
              id="leechThreshold"
              min="3"
              max="20"
              value={settings.learning.leechThreshold}
              onChange={(e) =>
                updateSettings({
                  learning: { ...settings.learning, leechThreshold: parseInt(e.target.value) || 8 },
                })
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cards with more lapses will be tagged as leeches and suspended
            </p>
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Timezone</h3>
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-foreground mb-2">
            Your Timezone
          </label>
          <select
            id="timezone"
            value={settings.learning.timezone}
            onChange={(e) =>
              updateSettings({
                learning: { ...settings.learning, timezone: e.target.value },
              })
            }
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
          >
            <option value="auto">Auto-detect</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">GMT (London)</option>
            <option value="Europe/Paris">Central European (Paris)</option>
            <option value="Asia/Tokyo">Japan Time</option>
            <option value="Asia/Shanghai">China Time</option>
            <option value="Australia/Sydney">Australia Eastern Time</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Determines when a new day starts for reviews
          </p>
        </div>
      </div>
    </div>
  );
}
