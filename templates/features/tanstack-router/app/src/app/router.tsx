import { createRouter } from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // @if tanstack-query
  // Let TanStack Query own caching for preloaded data.
  defaultPreloadStaleTime: 0,
  // @endif
  scrollRestoration: true,
})

// Registers the router type so <Link to> and useSearch are type-checked.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
