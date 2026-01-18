import { useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { UserProfilePanel } from "../components/settings/UserProfilePanel";
import { AISettings } from "../components/settings/AISettings";
import { SyncSettings } from "../components/settings/SyncSettings";
import { IntegrationSettings } from "../components/settings/IntegrationSettings";
import { AudioTranscriptionSettings } from "../components/settings/AudioTranscriptionSettings";
import { SmartQueuesSettings } from "../components/settings/SmartQueuesSettings";

type SettingsTab = "profile" | "general" | "ai" | "sync" | "integrations" | "audio-transcription" | "smart-queues" | "about";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="h-full flex bg-cream">
      {/* Settings Sidebar */}
      <div className="w-56 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        </div>
        <div className="p-2">
          {[
            { id: "profile" as const, label: "Profile", icon: "👤" },
            { id: "general" as const, label: "General", icon: "⚙️" },
            { id: "ai" as const, label: "AI", icon: "🤖" },
            { id: "sync" as const, label: "Sync", icon: "☁️" },
            { id: "integrations" as const, label: "Integrations", icon: "🔗" },
            { id: "audio-transcription" as const, label: "Audio Transcription", icon: "🎤" },
            { id: "smart-queues" as const, label: "Smart Queues", icon: "🧠" },
            { id: "about" as const, label: "About", icon: "ℹ️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full px-3 py-2 rounded text-left flex items-center gap-2 mb-1 transition-colors ${
                activeTab === tab.id
                  ? "bg-primary-100 text-primary-700"
                  : "hover:bg-muted"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "profile" && (
          <div className="p-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">User Profile</h3>
            <UserProfilePanel />
          </div>
        )}
        {activeTab === "general" && <GeneralSettings />}
        {activeTab === "ai" && <AISettings />}
        {activeTab === "sync" && <SyncSettings />}
        {activeTab === "integrations" && <IntegrationSettings />}
        {activeTab === "audio-transcription" && <AudioTranscriptionTab />}
        {activeTab === "smart-queues" && <SmartQueuesTab />}
        {activeTab === "about" && <AboutSettings />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-foreground mb-4">General Settings</h3>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-card border border-border rounded p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Appearance</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Theme</div>
                <div className="text-xs text-foreground-secondary">
                  Choose your preferred color scheme
                </div>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as any })}
                className="px-3 py-1.5 bg-background border border-border rounded text-sm"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Font Size</div>
                <div className="text-xs text-foreground-secondary">
                  Adjust the base font size
                </div>
              </div>
              <input
                type="number"
                min="10"
                max="20"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-16 px-2 py-1 bg-background border border-border rounded text-sm text-center"
              />
            </div>
          </div>
        </div>

        {/* Review Settings */}
        <div className="bg-card border border-border rounded p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Review Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Algorithm</div>
                <div className="text-xs text-foreground-secondary">
                  Spaced repetition algorithm
                </div>
              </div>
              <select
                value={settings.algorithm}
                onChange={(e) => updateSettings({ algorithm: e.target.value as any })}
                className="px-3 py-1.5 bg-background border border-border rounded text-sm"
              >
                <option value="fsrs">FSRS-5 (Recommended)</option>
                <option value="sm2">SuperMemo 2</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">New Cards per Day</div>
                <div className="text-xs text-foreground-secondary">
                  Maximum new cards to show daily
                </div>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.newCardsPerDay}
                onChange={(e) =>
                  updateSettings({ newCardsPerDay: Number(e.target.value) })
                }
                className="w-16 px-2 py-1 bg-background border border-border rounded text-sm text-center"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Reviews per Day</div>
                <div className="text-xs text-foreground-secondary">
                  Maximum reviews to show daily
                </div>
              </div>
              <input
                type="number"
                min="0"
                max="500"
                value={settings.reviewsPerDay}
                onChange={(e) =>
                  updateSettings({ reviewsPerDay: Number(e.target.value) })
                }
                className="w-16 px-2 py-1 bg-background border border-border rounded text-sm text-center"
              />
            </div>
          </div>
        </div>

        {/* Import Settings */}
        <div className="bg-card border border-border rounded p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Import Settings</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Auto-import</div>
                <div className="text-xs text-foreground-secondary">
                  Automatically import from watched folders
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoImport}
                onChange={(e) => updateSettings({ autoImport: e.target.checked })}
                className="rounded"
              />
            </label>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Default Category</div>
                <div className="text-xs text-foreground-secondary">
                  Category for imported documents
                </div>
              </div>
              <input
                type="text"
                value={settings.defaultCategory}
                onChange={(e) =>
                  updateSettings({ defaultCategory: e.target.value })
                }
                className="w-40 px-2 py-1 bg-background border border-border rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-foreground mb-4">About Incrementum</h3>

      <div className="bg-card border border-border rounded p-6 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Incrementum</h2>
        <p className="text-sm text-foreground-secondary mb-4">
          Version 1.0.0
        </p>
        <p className="text-sm text-foreground mb-6 max-w-md">
          Incrementum is your companion for incremental reading and spaced
          repetition learning. Import documents, create extracts, and master
          knowledge through intelligent flashcard reviews.
        </p>
        <div className="flex justify-center gap-4 text-sm">
          <a
            href="https://github.com/incrementum"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://docs.incrementum.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            Documentation
          </a>
          <a
            href="https://discord.gg/incrementum"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            Discord
          </a>
        </div>
      </div>
    </div>
  );
}

function AudioTranscriptionTab() {
  const { settings, updateSettings } = useSettingsStore();

  const handleUpdateSettings = (updates: Partial<typeof settings.audioTranscription>) => {
    updateSettings({ audioTranscription: { ...settings.audioTranscription, ...updates } });
  };

  return (
    <AudioTranscriptionSettings
      settings={settings.audioTranscription}
      onUpdateSettings={handleUpdateSettings}
    />
  );
}

function SmartQueuesTab() {
  const { settings, updateSettings } = useSettingsStore();

  const handleUpdateSettings = (updates: Partial<typeof settings.smartQueue>) => {
    updateSettings({ smartQueue: { ...settings.smartQueue, ...updates } });
  };

  return (
    <SmartQueuesSettings
      settings={settings.smartQueue}
      onUpdateSettings={handleUpdateSettings}
    />
  );
}
