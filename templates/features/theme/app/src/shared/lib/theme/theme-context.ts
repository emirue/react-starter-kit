import { createContext } from "react"

export type Theme = "dark" | "light" | "system"

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/** Keep in sync with the inline script in index.html, which applies the theme before React loads. */
export const THEME_STORAGE_KEY = "{{appName}}:theme"

export const ThemeContext = createContext<ThemeState | undefined>(undefined)
