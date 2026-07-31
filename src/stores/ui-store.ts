"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type Density = "default" | "compact";

/** Key is read by the inline boot script in the root layout — keep in sync. */
export const UI_STORAGE_KEY = "distrix.ui";

interface UiState {
  sidebarCollapsed: boolean;
  density: Density;
  theme: ThemeMode;
  activeWarehouseId: string;
  commandOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
  setTheme: (theme: ThemeMode) => void;
  setActiveWarehouse: (id: string) => void;
  setCommandOpen: (open: boolean) => void;
}

function resolveDark(theme: ThemeMode): boolean {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

/** Writes straight to <html> so the DOM is the single source of visual truth. */
function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveDark(theme));
  document.documentElement.style.colorScheme = resolveDark(theme) ? "dark" : "light";
}

function applyDensity(density: Density): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["density"] = density;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      density: "default",
      theme: "light",
      activeWarehouseId: "WH-PRQ",
      commandOpen: false,

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setDensity: (density) => {
        applyDensity(density);
        set({ density });
      },
      toggleDensity: () => {
        const next: Density = get().density === "default" ? "compact" : "default";
        applyDensity(next);
        set({ density: next });
      },

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setActiveWarehouse: (activeWarehouseId) => set({ activeWarehouseId }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
    }),
    {
      name: UI_STORAGE_KEY,
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
        theme: state.theme,
        activeWarehouseId: state.activeWarehouseId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyTheme(state.theme);
        applyDensity(state.density);
      },
    },
  ),
);
