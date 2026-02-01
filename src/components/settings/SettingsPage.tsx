/**
 * Settings page - Main settings UI with search functionality
 */

import { useState, useMemo, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Sliders,
  Palette,
  Keyboard,
  Brain,
  Cloud,
  FolderOpen,
  Bell,
  Shield,
  BookOpen,
  GraduationCap,
  RefreshCw,
  Plug,
  BookText,
  Search,
  X,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { KeyboardShortcutSettings } from "./KeyboardShortcutsSettings";
import { AISettings as AIProviderSettings } from "./AIProviderSettings";
import { ImportExportSettings as ImportExportSettingsComponent } from "./ImportExportSettings";
import { SyncSettings as SyncSettingsOriginal } from "./SyncSettings";
import { LearningSettings } from "./LearningSettings";
import { DocumentsSettings } from "./DocumentsSettings";
import { CloudStorageSettings } from "./CloudStorageSettings";
import { ThemePicker } from "./ThemePicker";
import { IntegrationSettings } from "./IntegrationSettings";
import { HandbookSettings } from "./HandbookSettings";
import { NotificationSettings } from "./NotificationSettings";
import { cn } from "../../utils";
import { getDeviceInfo } from "../../lib/pwa";

/**
 * Settings tab
 */
export enum SettingsTab {
  General = "general",
  Appearance = "appearance",
  Learning = "learning",
  Documents = "documents",
  Shortcuts = "shortcuts",
  AI = "ai",
  Sync = "sync",
  Integrations = "integrations",
  CloudStorage = "cloud-storage",
  ImportExport = "import-export",
  Notifications = "notifications",
  Privacy = "privacy",
  Handbook = "handbook",
}

/**
 * Settings tab config with keywords for search
 */
interface SettingsTabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  keywords: string[];
  description: string;
}

export const SETTINGS_TABS: SettingsTabConfig[] = [
  { 
    id: SettingsTab.General, 
    label: "General", 
    icon: Sliders,
    keywords: ["language", "startup", "default", "view", "auto-save", "backup", "data", "storage"],
    description: "Basic application settings, language, and data management"
  },
  { 
    id: SettingsTab.Appearance, 
    label: "Appearance", 
    icon: Palette,
    keywords: ["theme", "color", "font", "size", "typography", "dark mode", "light mode", "display", "compact"],
    description: "Customize the look and feel of the app"
  },
  { 
    id: SettingsTab.Learning, 
    label: "Learning", 
    icon: GraduationCap,
    keywords: ["algorithm", "fsrs", "interval", "review", "flashcard", "retention", "difficulty", "scheduler"],
    description: "Learning algorithm and review settings"
  },
  { 
    id: SettingsTab.Documents, 
    label: "Documents", 
    icon: BookOpen,
    keywords: ["import", "pdf", "epub", "reading", "extract", "annotation", "highlight"],
    description: "Document import and reading preferences"
  },
  { 
    id: SettingsTab.Shortcuts, 
    label: "Shortcuts", 
    icon: Keyboard,
    keywords: ["keyboard", "hotkey", "keybinding", "shortcut", "command", "vim"],
    description: "Keyboard shortcuts and keybindings"
  },
  { 
    id: SettingsTab.AI, 
    label: "AI", 
    icon: Brain,
    keywords: ["openai", "anthropic", "ollama", "llm", "model", "token", "api key", "assistant", "flashcard generation"],
    description: "AI provider settings and API keys"
  },
  { 
    id: SettingsTab.Sync, 
    label: "Sync", 
    icon: RefreshCw,
    keywords: ["synchronization", "backup", "cloud", "export", "import", "data transfer"],
    description: "Data synchronization settings"
  },
  { 
    id: SettingsTab.Integrations, 
    label: "Integrations", 
    icon: Plug,
    keywords: ["obsidian", "anki", "third-party", "extension", "browser", "plugin"],
    description: "Third-party app integrations"
  },
  { 
    id: SettingsTab.CloudStorage, 
    label: "Cloud Storage", 
    icon: Cloud,
    keywords: ["google drive", "dropbox", "onedrive", "backup", "cloud", "storage", "oauth"],
    description: "Cloud storage providers and backups"
  },
  { 
    id: SettingsTab.ImportExport, 
    label: "Import/Export", 
    icon: FolderOpen,
    keywords: ["data", "backup", "migration", "json", "csv", "archive", "transfer"],
    description: "Import and export your data"
  },
  { 
    id: SettingsTab.Notifications, 
    label: "Notifications", 
    icon: Bell,
    keywords: ["reminder", "alert", "study", "due", "email", "push", "sound"],
    description: "Notification and reminder settings"
  },
  { 
    id: SettingsTab.Privacy, 
    label: "Privacy", 
    icon: Shield,
    keywords: ["security", "password", "encryption", "private", "data protection", "gdpr"],
    description: "Privacy and security settings"
  },
  { 
    id: SettingsTab.Handbook, 
    label: "Handbook", 
    icon: BookText,
    keywords: ["guide", "help", "tutorial", "documentation", "manual", "how to", "learn"],
    description: "User guide and documentation"
  },
];

/**
 * Settings page component
 */
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState(SettingsTab.General);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;
  const initialTabKey = "incrementum_settings_initial_tab";

  useEffect(() => {
    const initial = localStorage.getItem(initialTabKey) as SettingsTab | null;
    if (initial && Object.values(SettingsTab).includes(initial)) {
      setActiveTab(initial);
      localStorage.removeItem(initialTabKey);
      if (isMobile) {
        setShowMobileMenu(false);
      }
    }
  }, [isMobile]);

  // Filter tabs based on search
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_TABS;
    
    const query = searchQuery.toLowerCase();
    return SETTINGS_TABS.filter((tab) => {
      const matchesLabel = tab.label.toLowerCase().includes(query);
      const matchesKeywords = tab.keywords.some((k) => k.toLowerCase().includes(query));
      const matchesDescription = tab.description.toLowerCase().includes(query);
      return matchesLabel || matchesKeywords || matchesDescription;
    });
  }, [searchQuery]);

  // Group filtered results by relevance for search display
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    return SETTINGS_TABS.map((tab) => {
      let score = 0;
      if (tab.label.toLowerCase().includes(query)) score += 3;
      if (tab.keywords.some((k) => k.toLowerCase().includes(query))) score += 2;
      if (tab.description.toLowerCase().includes(query)) score += 1;
      return { ...tab, score };
    })
      .filter((tab) => tab.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [searchQuery]);

  const handleTabChange = (tab: SettingsTab) => {
    if (hasChanges) {
      const confirm = window.confirm(
        "You have unsaved changes. Are you sure you want to switch tabs?"
      );
      if (!confirm) return;
    }
    setActiveTab(tab);
    setHasChanges(false);
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  const handleSave = () => {
    setHasChanges(false);
  };

  const handleReset = () => {
    const confirm = window.confirm(
      "Are you sure you want to reset all settings to default?"
    );
    if (confirm) {
      setHasChanges(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Mobile back button handler
  const handleMobileBack = () => {
    setShowMobileMenu(true);
  };

  // Current tab config
  const currentTabConfig = SETTINGS_TABS.find((t) => t.id === activeTab);

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar / Mobile Menu */}
      <div className={cn(
        "flex-shrink-0 border-r border-border bg-muted/30 text-foreground",
        isMobile 
          ? showMobileMenu ? "w-full" : "hidden" 
          : "w-64"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>

          {/* Search Bar */}
          <div className={cn(
            "relative transition-all",
            isSearchFocused && "ring-2 ring-primary rounded-lg"
          )}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search settings..."
              className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100% - 140px)" }}>
          {searchQuery ? (
            // Search Results
            searchResults && searchResults.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Search Results
                </div>
                {searchResults.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-colors text-left",
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{tab.label}</div>
                        <div className={cn(
                          "text-xs mt-0.5 line-clamp-1",
                          activeTab === tab.id 
                            ? "text-primary-foreground/80" 
                            : "text-muted-foreground"
                        )}>
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="px-3 py-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No settings found for "{searchQuery}"</p>
                <p className="text-xs mt-1 opacity-70">Try different keywords</p>
              </div>
            )
          ) : (
            // Normal Tab List
            SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {isMobile && (
                    <ChevronRight className={cn(
                      "w-4 h-4 ml-auto",
                      activeTab === tab.id ? "opacity-100" : "opacity-40"
                    )} />
                  )}
                </button>
              );
            })
          )}
        </nav>
      </div>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        isMobile && showMobileMenu ? "hidden" : "flex"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            {isMobile && (
              <button
                onClick={handleMobileBack}
                className="p-2 -ml-2 rounded-full hover:bg-muted"
                aria-label="Back to settings menu"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
                {currentTabConfig && (
                  <currentTabConfig.icon className="w-5 h-5 text-muted-foreground" />
                )}
                {currentTabConfig?.label}
              </h2>
              {!isMobile && currentTabConfig && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {currentTabConfig.description}
                </p>
              )}
            </div>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-sm text-muted-foreground">Unsaved changes</span>
              <button
                onClick={handleSave}
                className="px-4 py-2 md:py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors min-h-[44px] text-sm font-medium"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === SettingsTab.General && <GeneralSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Appearance && <AppearanceSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Learning && <LearningSettings />}
          {activeTab === SettingsTab.Documents && <DocumentsSettings />}
          {activeTab === SettingsTab.Shortcuts && <ShortcutSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.AI && <AISettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Sync && <SyncSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Integrations && <IntegrationSettings />}
          {activeTab === SettingsTab.CloudStorage && <CloudStorageSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.ImportExport && <ImportExportSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Notifications && <NotificationSettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Privacy && <PrivacySettings onChange={() => setHasChanges(true)} />}
          {activeTab === SettingsTab.Handbook && <HandbookSettings />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-t border-border bg-muted/30">
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
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * Settings row component - Mobile optimized
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
    <div className="flex flex-col sm:flex-row sm:items-start justify-between py-4 border-b border-border last:border-0 gap-3 sm:gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="sm:ml-4 flex-shrink-0">{children}</div>
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
        <SettingsRow
          label="Language"
          description="Select your preferred language"
        >
          <select
            className="w-full sm:w-auto px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[44px]"
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
            className="w-full sm:w-auto px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[44px]"
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
            className="w-full sm:w-auto px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[44px]"
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
      </SettingsSection>

      <SettingsSection
        title="Data"
        description="Data storage and management"
      >
        <SettingsRow
          label="Data Location"
          description="Folder where all data is stored"
        >
          <div className="flex items-center gap-2">
            <button className="w-full sm:w-auto px-4 py-2.5 bg-background border border-border rounded-lg hover:bg-muted text-sm font-medium min-h-[44px]">
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
            className="w-full sm:w-24 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[44px]"
          />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}

/**
 * Appearance Settings Component
 */
function AppearanceSettings({ onChange }: { onChange: () => void }) {
  return (
    <>
      <SettingsSection title="Theme" description="Customize the look and feel">
        <ThemePicker />
      </SettingsSection>

      <SettingsSection
        title="Typography"
        description="Font settings"
      >
        <SettingsRow
          label="Font Family"
          description="Choose your preferred font"
        >
          <select
            className="w-full sm:w-auto px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[44px]"
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
          <div className="flex items-center gap-3">
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
            className="w-full sm:w-auto px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[44px]"
            onChange={onChange}
            defaultValue="1.5"
          >
            <option value="1.25">Compact</option>
            <option value="1.5">Normal</option>
            <option value="1.75">Relaxed</option>
            <option value="2">Loose</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Display"
        description="Display preferences"
      >
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
            className="w-full sm:w-auto px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[44px]"
            onChange={onChange}
            defaultValue="medium"
          >
            <option value="narrow">Narrow</option>
            <option value="medium">Medium</option>
            <option value="wide">Wide</option>
          </select>
        </SettingsRow>
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
  return <SyncSettingsOriginal />;
}

function ImportExportSettings({ onChange }: { onChange: () => void }) {
  return <ImportExportSettingsComponent onChange={onChange} />;
}

function PrivacySettings({ onChange }: { onChange: () => void }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Privacy settings coming soon</p>
    </div>
  );
}
