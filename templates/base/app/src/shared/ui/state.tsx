// @if shadcn || ui-primitives
// @if api-client
import { getErrorMessage } from "@/shared/api/api-error"
// @endif

import { Button } from "./button"
// @if tailwind
import { Skeleton } from "./skeleton"
// @endif
// @if !api-client

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.")
// @endif

/** Loading placeholder for a data region. Announced politely to screen readers. */
// @if tailwind
export function LoadingState({ label, rows = 2 }: { label: string; rows?: number }) {
// @else
export function LoadingState({ label }: { label: string; rows?: number }) {
// @endif
  return (
    // @if tailwind
    <div role="status" aria-label={label} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={i % 2 ? "h-5 w-1/2" : "h-5 w-2/3"} />
      ))}
    </div>
    // @else
    <p role="status" aria-label={label}>
      {label}…
    </p>
    // @endif
  )
}

/** Error message for a data region, with an optional retry. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    // @if tailwind
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
      <span>{getErrorMessage(error)}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
    // @else
    <div role="alert">
      <span>{getErrorMessage(error)}</span>
      {onRetry && <Button onClick={onRetry}>Retry</Button>}
    </div>
    // @endif
  )
}

/** Shown when a data region has nothing to display. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    // @if tailwind
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    // @else
    <div>
      <p>{title}</p>
      {description && <p>{description}</p>}
    </div>
    // @endif
  )
}
// @endif
