import { createRouter } from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"
import { ErrorFallback } from "@/shared/ui/error-fallback"

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // @if tanstack-query
  // Let TanStack Query own caching for preloaded data.
  defaultPreloadStaleTime: 0,
  // @endif
  // Every route gets its own boundary, so a page error keeps the layout and navigation.
  defaultErrorComponent: ({ error, reset }) => <ErrorFallback error={error} onRetry={reset} />,
  scrollRestoration: true,
})

// Registers the router type so <Link to> and useSearch are type-checked.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
