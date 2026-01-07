/**
 * Keyboard Shortcut Settings Component
 */

import { useState } from "react";
import {
  KeyboardShortcutsHelp,
  formatKeyCombo,
  useShortcutStore,
  DEFAULT_SHORTCUTS,
  ShortcutCategory,
} from "../common/KeyboardShortcuts";
import { SettingsSection, SettingsRow } from "./SettingsPage";

/**
 * Keyboard shortcut recording button
 */
function ShortcutRecorder({
  combo,
  onUpdate,
}: {
  combo: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean };
  onUpdate: (combo: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = () => {
    setIsRecording(true);

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newCombo = {
        key: e.key,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
      };

      onUpdate(newCombo);
      setIsRecording(false);

      window.removeEventListener("keydown", handler, true);
    };

    window.addEventListener("keydown", handler, true);
  };

  return (
    <button
      onClick={handleRecord}
      className={`px-3 py-2 border border-border rounded-md text-sm min-w-32 transition-colors ${
        isRecording
          ? "bg-primary text-primary-foreground animate-pulse"
          : "bg-background hover:bg-muted"
      }`}
    >
      {isRecording ? "Press keys..." : formatKeyCombo(combo)}
    </button>
  );
}

/**
 * Keyboard Shortcut Settings
 */
export function KeyboardShortcutSettings({ onChange }: { onChange: () => void }) {
  const { shortcuts, updateShortcut, resetShortcut, resetAll } = useShortcutStore();

  const grouped = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <>
      <SettingsSection
        title="Keyboard Shortcuts"
        description="Customize keyboard shortcuts for quick actions"
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              resetAll();
              onChange();
            }}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Reset all to defaults
          </button>
        </div>

        {Object.entries(grouped).map(([category, shortcuts]) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {category}
            </h3>

            <div className="space-y-1">
              {shortcuts.map((shortcut) => {
                const combo = shortcut.currentCombo || shortcut.defaultCombo;

                return (
                  <SettingsRow
                    key={shortcut.id}
                    label={shortcut.name}
                    description={shortcut.description}
                  >
                    <div className="flex items-center gap-2">
                      {shortcut.editable !== false && (
                        <ShortcutRecorder
                          combo={combo}
                          onUpdate={(newCombo) => {
                            updateShortcut(shortcut.id, newCombo);
                            onChange();
                          }}
                        />
                      )}

                      {shortcut.currentCombo && (
                        <button
                          onClick={() => {
                            resetShortcut(shortcut.id);
                            onChange();
                          }}
                          className="p-2 hover:bg-destructive/10 hover:text-destructive rounded"
                          title="Reset to default"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </SettingsRow>
                );
              })}
            </div>
          </div>
        ))}
      </SettingsSection>

      <SettingsSection
        title="Vimium Navigation"
        description="Vimium-style keyboard navigation settings"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Enable Vimium Navigation"
            description="Use keyboard shortcuts for navigation (like Vimium)"
          >
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </SettingsRow>

          <SettingsRow
            label="Link Hint Keys"
            description="Characters used for link hints"
          >
            <input
              type="text"
              defaultValue="asdfghjkl;qwertyuiopzxcvbnm"
              onChange={onChange}
              className="w-64 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
            />
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}
