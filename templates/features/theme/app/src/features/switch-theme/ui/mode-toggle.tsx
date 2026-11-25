// @if lucide
import { Monitor, Moon, Sun } from "lucide-react"

// @endif
import { useTheme, type Theme } from "@/shared/lib/theme"
import { Button } from "@/shared/ui/button"

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
]

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div role="group" aria-label="Color theme" className="flex items-center gap-1">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={theme === option.value ? "secondary" : "ghost"}
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
        >
          {/* @if lucide */}
          {option.value === "light" && <Sun aria-hidden="true" />}
          {option.value === "dark" && <Moon aria-hidden="true" />}
          {option.value === "system" && <Monitor aria-hidden="true" />}
          <span className="sr-only sm:not-sr-only">{option.label}</span>
          {/* @else */}
          {option.label}
          {/* @endif */}
        </Button>
      ))}
    </div>
  )
}
