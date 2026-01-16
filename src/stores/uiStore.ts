import { create } from "zustand";
import { generateId } from "../utils/id";
import { ViewName, Toast } from "../types";

interface UIState {
  // Navigation
  currentView: ViewName;
  sidebarCollapsed: boolean;
  dockPanelCollapsed: boolean;

  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown>;

  // Toasts
  toasts: Toast[];

  // Command Palette
  commandPaletteOpen: boolean;
  commandPaletteQuery: string;

  // Theme
  theme: "light" | "dark";

  // Actions
  setCurrentView: (view: ViewName) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDockPanelCollapsed: (collapsed: boolean) => void;
  openModal: (modal: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCommandPaletteQuery: (query: string) => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial State
  currentView: "queue",
  sidebarCollapsed: false,
  dockPanelCollapsed: false,
  activeModal: null,
  modalData: {},
  toasts: [],
  commandPaletteOpen: false,
  commandPaletteQuery: "",
  theme: "dark",

  // Actions
  setCurrentView: (currentView) => set({ currentView }),

  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  setDockPanelCollapsed: (dockPanelCollapsed) => set({ dockPanelCollapsed }),

  openModal: (activeModal, modalData = {}) =>
    set({
      activeModal,
      modalData,
    }),

  closeModal: () =>
    set({
      activeModal: null,
      modalData: {},
    }),

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: generateId(),
        },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setCommandPaletteOpen: (commandPaletteOpen) =>
    set({
      commandPaletteOpen,
      commandPaletteQuery: commandPaletteOpen ? "" : "",
    }),

  setCommandPaletteQuery: (commandPaletteQuery) => set({ commandPaletteQuery }),

  setTheme: (theme) => set({ theme }),
}));
