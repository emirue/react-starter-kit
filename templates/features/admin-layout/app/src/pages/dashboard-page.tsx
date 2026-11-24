import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Static numbers for the starter. Replace them with queries to your API.
const STATS = [
  { label: "Active users", value: "1,284", change: "+4.2%" },
  { label: "New sign-ups", value: "86", change: "+12%" },
  { label: "Open tickets", value: "23", change: "-8%" },
  { label: "Uptime", value: "99.98%", change: "30 days" },
]

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">An overview of your application.</p>
      </div>
      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
              <Badge variant="secondary" className="w-fit">
                {stat.change}
              </Badge>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  )
}
