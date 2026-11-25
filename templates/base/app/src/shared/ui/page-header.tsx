// @if shadcn || ui-primitives
import type { ReactNode } from "react"

/** The title block of a page: one h1, an optional description and actions. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    // @if tailwind
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    // @else
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {actions}
    </div>
    // @endif
  )
}
// @endif
