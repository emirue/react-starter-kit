import { createBrowserRouter } from "react-router"

import { NotFoundPage } from "@/pages/not-found"
import { PageLoader } from "@/shared/ui/page-loader"

// @if admin-layout
import { AdminLayout as Layout } from "./layouts/admin-layout"
// @else
import { RootLayout as Layout } from "./layouts/root-layout"
// @endif
import { RouteError } from "./route-error"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    // Errors in the layout itself.
    ErrorBoundary: RouteError,
    // Shown while lazy routes load on the first visit.
    HydrateFallback: PageLoader,
    children: [
      {
        // Errors in a page render inside the layout, so navigation stays usable.
        ErrorBoundary: RouteError,
        children: [
          // @if admin-layout
          { index: true, lazy: { Component: async () => (await import("@/pages/dashboard")).DashboardPage } },
          // @if examples
          { path: "users", lazy: { Component: async () => (await import("@/pages/users")).UsersPage } },
          // @endif
          { path: "settings", lazy: { Component: async () => (await import("@/pages/settings")).SettingsPage } },
          // @else
          { index: true, lazy: { Component: async () => (await import("@/pages/home")).HomePage } },
          // @endif
          // @if example-pages
          {
            path: "examples",
            lazy: { Component: async () => (await import("./layouts/examples-layout")).ExamplesLayout },
            children: [
              { index: true, lazy: { Component: async () => (await import("@/pages/examples")).ExamplesPage } },
              // @if tanstack-query
              { path: "todos", lazy: { Component: async () => (await import("@/pages/todos-example")).TodosPage } },
              // @endif
              // @if forms-example
              { path: "sign-up", lazy: { Component: async () => (await import("@/pages/sign-up-example")).SignUpPage } },
              // @endif
              // @if zustand
              { path: "counter", lazy: { Component: async () => (await import("@/pages/counter-example")).CounterPage } },
              // @endif
            ],
          },
          // @endif
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
])
