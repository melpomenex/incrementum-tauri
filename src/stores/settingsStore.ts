import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppSettings {
  // Appearance
  theme: "light" | "dark" | "system";
  fontSize: number;
  fontFamily: string;

  // Review
  algorithm: "fsrs" | "sm2";
  newCardsPerDay: number;
  reviewsPerDay: number;
  autoPlayAudio: boolean;

  // Import
  autoImport: boolean;
  importWatchFolders: string[];
  defaultCategory: string;

  // Sync
  syncEnabled: boolean;
  syncInterval: number;
  syncOnStartup: boolean;

  // Privacy
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: "system",
  fontSize: 14,
  fontFamily: "Inter",
  algorithm: "fsrs",
  newCardsPerDay: 20,
  reviewsPerDay: 100,
  autoPlayAudio: false,
  autoImport: false,
  importWatchFolders: [],
  defaultCategory: "Uncategorized",
  syncEnabled: false,
  syncInterval: 60,
  syncOnStartup: true,
  telemetryEnabled: false,
  crashReportsEnabled: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: "incrementum-settings",
    }
  )
);
