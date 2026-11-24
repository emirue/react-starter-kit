// Adapted from the shadcn/ui Vite template (MIT License).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { THEME_STORAGE_KEY, ThemeContext, type Theme } from "./theme-context"

const DARK_QUERY = "(prefers-color-scheme: dark)"

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system"
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_QUERY).matches)
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

export function ThemeProvider({ children, defaultTheme = "system" }: { children: ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : defaultTheme
  })

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system") return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => applyTheme("system")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
