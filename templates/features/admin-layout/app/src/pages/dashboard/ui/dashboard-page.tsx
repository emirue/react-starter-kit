import { Badge } from "@/shared/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { PageHeader } from "@/shared/ui/page-header"

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
      <PageHeader title="Dashboard" description="An overview of your application." />
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
