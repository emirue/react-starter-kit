import { ModeToggle } from "@/components/theme/mode-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUiStore } from "@/stores/ui-store"

export function SettingsPage() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Appearance</h2>
          </CardTitle>
          <CardDescription>Saved in this browser.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <ModeToggle />
          <Button variant="outline" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
