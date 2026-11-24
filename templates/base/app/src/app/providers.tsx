// @if providers
// @if tanstack-query
import { QueryClientProvider } from "@tanstack/react-query"
// @endif
// @if tanstack-query-devtools
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
// @endif
import type { ReactNode } from "react"

// @if theme
import { ThemeProvider } from "@/components/theme/theme-provider"
// @endif
// @if admin-layout
import { Toaster } from "@/components/ui/sonner"
// @endif
// @if tanstack-query
import { queryClient } from "@/lib/query-client"
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
