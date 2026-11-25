import { isRouteErrorResponse, useRouteError } from "react-router"

import { NotFoundPage } from "@/pages/not-found"
import { ErrorFallback } from "@/shared/ui/error-fallback"

/** Route error boundary: data-mode ErrorBoundary components take no props. */
export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  const shown = isRouteErrorResponse(error) ? new Error(`${error.status} ${error.statusText}`) : error
  return <ErrorFallback error={shown} onRetry={() => window.location.reload()} />
}
