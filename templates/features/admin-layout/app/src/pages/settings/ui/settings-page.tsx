import { ModeToggle } from "@/features/switch-theme"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { PageHeader } from "@/shared/ui/page-header"
import { useSidebar } from "@/shared/ui/sidebar"

export function SettingsPage() {
  // The page renders inside the admin SidebarProvider, so it controls the same sidebar.
  // On small screens the sidebar is a sheet opened from the header, so there is nothing to collapse.
  const { open, setOpen, isMobile } = useSidebar()
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" description="Preferences are saved in this browser." />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Appearance</h2>
          </CardTitle>
          <CardDescription>Color theme and layout.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <ModeToggle />
          {!isMobile && (
            <Button variant="outline" onClick={() => setOpen(!open)}>
              {open ? "Collapse sidebar" : "Expand sidebar"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
