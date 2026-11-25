import { QueryClient } from "@tanstack/react-query"

/**
 * App-wide defaults. Set per-query policies in the query options of the
 * slice that owns the data, e.g. `queryOptions({ ..., staleTime: 0 })`.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
      mutations: {
        // Mutations are not idempotent in general: never retry automatically.
        retry: false,
      },
    },
  })
}
