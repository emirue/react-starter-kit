// @if testing-library
// @if tanstack-query
import { QueryClientProvider } from "@tanstack/react-query"
// @endif
import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement } from "react"

// @if tanstack-query
import { createQueryClient } from "@/shared/api/query-client"

// @endif
/**
 * Renders `ui` inside the providers a page slice needs.
 * Every call gets its own QueryClient (the app's factory) with retries off.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  // @if tanstack-query
  const client = createQueryClient()
  const defaults = client.getDefaultOptions()
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } })
  return render(ui, {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    ...options,
  })
  // @else
  return render(ui, options)
  // @endif
}
// @endif
