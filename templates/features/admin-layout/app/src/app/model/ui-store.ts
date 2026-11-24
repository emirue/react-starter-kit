import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UiState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

/** Admin shell state. Persisted: a layout preference, nothing sensitive. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: "{{appName}}:ui", version: 1 }
  )
)
