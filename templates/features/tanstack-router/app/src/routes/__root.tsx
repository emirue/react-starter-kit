import { createRootRoute } from "@tanstack/react-router"

import { ErrorFallback } from "@/components/error-fallback"
// @if admin-layout
import { AdminLayout } from "@/layouts/admin-layout"
// @else
import { RootLayout } from "@/layouts/root-layout"
// @endif
import { NotFoundPage } from "@/pages/not-found-page"

export const Route = createRootRoute({
  // @if admin-layout
  component: AdminLayout,
  // @else
  component: RootLayout,
  // @endif
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error, reset }) => <ErrorFallback error={error} onRetry={reset} />,
})
