import { createRootRoute } from "@tanstack/react-router"

// @if admin-layout
import { AdminLayout } from "@/app/layouts/admin-layout"
// @else
import { RootLayout } from "@/app/layouts/root-layout"
// @endif
import { NotFoundPage } from "@/pages/not-found"
import { ErrorFallback } from "@/shared/ui/error-fallback"

export const Route = createRootRoute({
  // @if admin-layout
  component: AdminLayout,
  // @else
  component: RootLayout,
  // @endif
  notFoundComponent: NotFoundPage,
  // Errors in the layout itself; page errors use the router's defaultErrorComponent.
  errorComponent: ({ error, reset }) => <ErrorFallback error={error} onRetry={reset} />,
})
