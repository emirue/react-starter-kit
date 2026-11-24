import { isRouteErrorResponse, useRouteError } from "react-router"

import { ErrorFallback } from "@/components/error-fallback"
import { NotFoundPage } from "@/pages/not-found-page"

/** Route-level error boundary: data-mode ErrorBoundary components take no props. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  const shown = isRouteErrorResponse(error) ? new Error(`${error.status} ${error.statusText}`) : error
  return <ErrorFallback error={shown} onRetry={() => window.location.reload()} />
}
