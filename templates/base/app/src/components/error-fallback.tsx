// @if router || error-boundary
// @if tailwind
import { Button } from "@/components/ui/button"

// @endif
/** Shown by route error boundaries and the top-level error boundary. */
export function ErrorFallback({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "An unexpected error occurred."
  return (
    // @if tailwind
    <div role="alert" className="mx-auto flex max-w-xl flex-col items-start gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        <Button variant="outline" onClick={() => window.location.assign("/")}>
          Go to the home page
        </Button>
      </div>
    </div>
    // @else
    <div role="alert">
      <h1>Something went wrong</h1>
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
    // @endif
  )
}
// @endif
