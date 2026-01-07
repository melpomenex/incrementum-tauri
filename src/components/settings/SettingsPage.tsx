/**
 * Settings page - Main settings UI
 */

import { useState } from "react";
import { useTheme, useAvailableThemes } from "../common/ThemeSystem";
import {
  Settings as SettingsIcon,
  General,
  Palette,
  Keyboard,
  Brain,
  Cloud,
  FolderOpen,
  Bell,
  Shield,
} from "lucide-react";
import { KeyboardShortcutSettings } from "./KeyboardShortcutsSettings";
import { AISettings as AIProviderSettings } from "./AIProviderSettings";
import { ImportExportSettings as ImportExportSettingsComponent } from "./ImportExportSettings";
import { SyncSettings as SyncSettingsOriginal } from "../../api/sync";

/**
 * Settings tab
 */
export enum SettingsTab {
  General = "general",
  Appearance = "appearance",
  Shortcuts = "shortcuts",
  AI = "ai",
  Sync = "sync",
  ImportExport = "import-export",
  Notifications = "notifications",
  Privacy = "privacy",
}

/**
 * Settings tab config
 */
export const SETTINGS_TABS = [
  { id: SettingsTab.General, label: "General", icon: General },
  { id: SettingsTab.Appearance, label: "Appearance", icon: Palette },
  { id: SettingsTab.Shortcuts, label: "Shortcuts", icon: Keyboard },
  { id: SettingsTab.AI, label: "AI", icon: Brain },
  { id: SettingsTab.Sync, label: "Sync", icon: Cloud },
  { id: SettingsTab.ImportExport, label: "Import/Export", icon: FolderOpen },
  { id: SettingsTab.Notifications, label: "Notifications", icon: Bell },
  { id: SettingsTab.Privacy, label: "Privacy", icon: Shield },
];

/**
 * Settings page component
 */
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState(SettingsTab.General);
  const [hasChanges, setHasChanges] = useState(false);

  const handleTabChange = (tab: SettingsTab) => {
    if (hasChanges) {
      const confirm = window.confirm(
        "You have unsaved changes. Are you sure you want to switch tabs?"
      );
      if (!confirm) return;
    }
    setActiveTab(tab);
    setHasChanges(false);
  };

  const handleSave = () => {
    // Save settings
    setHasChanges(false);
  };

  const handleReset = () => {
    const confirm = window.confirm(
      "Are you sure you want to reset all settings to default?"
    );
    if (confirm) {
      // Reset settings
      setHasChanges(false);
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/30">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">
              {SETTINGS_TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure your application settings
            </p>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === SettingsTab.General && <GeneralSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Appearance && <AppearanceSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Shortcuts && <ShortcutSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.AI && <AISettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Sync && <SyncSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.ImportExport && <ImportExportSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Notifications && <NotificationSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Privacy && <PrivacySettings onChange={() => setHasChanges(true)} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Reset to defaults
          </button>
          <p className="text-xs text-muted-foreground">
            Changes are saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings section wrapper
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Settings row component
 */
export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );
}

/**
 * General Settings Component
 */
function GeneralSettings({ onChange }: { onChange: () => void }) {
  return (
    <>
      <SettingsSection
        title="Application"
        description="Basic application settings"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Language"
            description="Select your preferred language"
          >
            <select
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={onChange}
              defaultValue="en"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
            </select>
          </SettingsRow>

          <SettingsRow
            label="Default View"
            description="Select the default view on startup"
          >
            <select
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={onChange}
              defaultValue="queue"
            >
              <option value="queue">Queue</option>
              <option value="review">Review</option>
              <option value="documents">Documents</option>
              <option value="analytics">Analytics</option>
            </select>
          </SettingsRow>

          <SettingsRow
            label="Auto-save Interval"
            description="How often to automatically save changes"
          >
            <select
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={onChange}
              defaultValue="30"
            >
              <option value="5">5 seconds</option>
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
            </select>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Data"
        description="Data storage and management"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Data Location"
            description="Folder where all data is stored"
          >
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 bg-background border border-border rounded-md hover:bg-muted text-sm">
                Open Folder
              </button>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Backup on Exit"
            description="Create automatic backup when closing the app"
          >
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </SettingsRow>

          <SettingsRow
            label="Max Backups"
            description="Maximum number of backups to keep"
          >
            <input
              type="number"
              min="1"
              max="100"
              defaultValue="10"
              onChange={onChange}
              className="w-20 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}

/**
 * Appearance Settings Component
 */
function AppearanceSettings({ onChange }: { onChange: () => void }) {
  const { theme, setTheme } = useTheme();
  const availableThemes = useAvailableThemes();

  return (
    <>
      <SettingsSection
        title="Theme"
        description="Customize the look and feel"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Base Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {availableThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t);
                    onChange();
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme.id === t.id
                      ? "border-primary shadow-lg"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  style={{ backgroundColor: t.colors.background }}
                >
                  <div className="space-y-2">
                    <div
                      className="w-full h-4 rounded"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                    <div className="flex gap-1">
                      <div
                        className="w-1/2 h-2 rounded"
                        style={{ backgroundColor: t.colors.accent }}
                      />
                      <div
                        className="w-1/2 h-2 rounded"
                        style={{ backgroundColor: t.colors.success }}
                      />
                    </div>
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: t.colors.foreground }}>
                    {t.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Typography"
        description="Font settings"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Font Family"
            description="Choose your preferred font"
          >
            <select
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={onChange}
              defaultValue="inter"
            >
              <option value="inter">Inter</option>
              <option value="system">System UI</option>
              <option value="sans">Sans Serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </SettingsRow>

          <SettingsRow
            label="Font Size"
            description="Base font size for the interface"
          >
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="12"
                max="20"
                defaultValue="14"
                onChange={onChange}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground w-12">14px</span>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Line Height"
            description="Line height for text content"
          >
            <select
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={onChange}
              defaultValue="1.5"
            >
              <option value="1.25">Compact</option>
              <option value="1.5">Normal</option>
              <option value="1.75">Relaxed</option>
              <option value="2">Loose</option>
            </select>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Display"
        description="Display preferences"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Compact Mode"
            description="Reduce spacing and padding for more content"
          >
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </SettingsRow>

          <SettingsRow
            label="Sidebar Width"
            description="Width of the navigation sidebar"
          >
            <select
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={onChange}
              defaultValue="medium"
            >
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
            </select>
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}

// Wrapper components for settings
function ShortcutSettings({ onChange }: { onChange: () => void }) {
  return <KeyboardShortcutSettings onChange={onChange} />;
}

function AISettings({ onChange }: { onChange: () => void }) {
  return <AIProviderSettings onChange={onChange} />;
}

function SyncSettings({ onChange }: { onChange: () => void }) {
  // The existing SyncSettings component doesn't take an onChange prop
  return <SyncSettingsOriginal />;
}

function ImportExportSettings({ onChange }: { onChange: () => void }) {
  return <ImportExportSettingsComponent onChange={onChange} />;
}

function NotificationSettings({ onChange }: { onChange: () => void }) {
  return <div className="text-center py-12 text-muted-foreground">Notification settings coming soon</div>;
}

function PrivacySettings({ onChange }: { onChange: () => void }) {
  return <div className="text-center py-12 text-muted-foreground">Privacy settings coming soon</div>;
}
