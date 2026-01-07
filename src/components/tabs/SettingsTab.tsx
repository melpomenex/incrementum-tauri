import { useSettingsStore } from "../../stores";
import { useEffect } from "react";

export function SettingsTab() {
  const { settings, updateSettings } = useSettingsStore();

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    if (settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.theme]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Customize your Incrementum experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Appearance</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Theme</div>
                  <div className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </div>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSettings({ theme: e.target.value as any })}
                  className="px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Font Size</div>
                  <div className="text-sm text-muted-foreground">
                    Adjust the base font size
                  </div>
                </div>
                <input
                  type="number"
                  min="10"
                  max="20"
                  value={settings.fontSize}
                  onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                  className="w-20 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Review Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Review Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Algorithm</div>
                  <div className="text-sm text-muted-foreground">
                    Spaced repetition algorithm
                  </div>
                </div>
                <select
                  value={settings.algorithm}
                  onChange={(e) => updateSettings({ algorithm: e.target.value as any })}
                  className="px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="fsrs">FSRS-5 (Recommended)</option>
                  <option value="sm2">SuperMemo 2</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">New Cards per Day</div>
                  <div className="text-sm text-muted-foreground">
                    Maximum new cards to show daily
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.newCardsPerDay}
                  onChange={(e) => updateSettings({ newCardsPerDay: Number(e.target.value) })}
                  className="w-20 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Reviews per Day</div>
                  <div className="text-sm text-muted-foreground">
                    Maximum reviews to show daily
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={settings.reviewsPerDay}
                  onChange={(e) => updateSettings({ reviewsPerDay: Number(e.target.value) })}
                  className="w-20 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Import Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Import Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Auto-import</div>
                  <div className="text-sm text-muted-foreground">
                    Automatically import from watched folders
                  </div>
                </div>
                <button
                  onClick={() => updateSettings({ autoImport: !settings.autoImport })}
                  className={`
                    w-12 h-6 rounded-full transition-colors relative
                    ${settings.autoImport ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <div
                    className={`
                      w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                      ${settings.autoImport ? "left-6" : "left-0.5"}
                    `}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Default Category</div>
                  <div className="text-sm text-muted-foreground">
                    Category for imported documents
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.defaultCategory}
                  onChange={(e) => updateSettings({ defaultCategory: e.target.value })}
                  className="w-48 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
