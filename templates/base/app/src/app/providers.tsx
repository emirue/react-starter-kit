// @if providers
// @if tanstack-query
import { QueryClientProvider } from "@tanstack/react-query"
// @endif
// @if tanstack-query-devtools
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
// @endif
import type { ReactNode } from "react"

// @if tanstack-query
import { createQueryClient } from "@/shared/api/query-client"
// @endif
// @if theme
import { ThemeProvider } from "@/shared/lib/theme"
// @endif
// @if admin-layout
import { Toaster } from "@/shared/ui/sonner"
// @endif

// @if tanstack-query
const queryClient = createQueryClient()

// @endif
/** Every app-wide provider lives here, once. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    // @if theme
    <ThemeProvider>
    // @endif
    // @if tanstack-query
      <QueryClientProvider client={queryClient}>
    // @endif
        {children}
    // @if admin-layout
        <Toaster />
    // @endif
    // @if tanstack-query-devtools
        {/* Excluded from production builds automatically. */}
        <ReactQueryDevtools buttonPosition="bottom-left" />
    // @endif
    // @if tanstack-query
      </QueryClientProvider>
    // @endif
    // @if theme
    </ThemeProvider>
    // @endif
  )
}
// @endif
