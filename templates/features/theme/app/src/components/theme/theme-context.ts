import { createContext } from "react"

export type Theme = "dark" | "light" | "system"

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const THEME_STORAGE_KEY = "theme"

export const ThemeContext = createContext<ThemeState | undefined>(undefined)
