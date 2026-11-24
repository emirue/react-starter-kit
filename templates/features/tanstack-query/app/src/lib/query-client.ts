import { QueryClient } from "@tanstack/react-query"

/**
 * App-wide defaults. Override per query, e.g.
 * `useQuery({ ...todosQueryOptions(), staleTime: 0 })`.
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

export const queryClient = createQueryClient()
