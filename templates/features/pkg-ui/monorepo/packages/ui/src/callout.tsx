import type { ReactNode } from "react"

/** A shared component. Apps scan this package with Tailwind's @source. */
export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="flex flex-col gap-1 rounded-lg border border-l-4 border-dashed p-4">
      <p className="font-medium">{title}</p>
      <div className="text-sm text-muted-foreground">{children}</div>
    </aside>
  )
}
