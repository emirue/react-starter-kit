import { createBrowserRouter } from "react-router"

// @if admin-layout
import { AdminLayout } from "@/layouts/admin-layout"
import { DashboardPage } from "@/pages/dashboard-page"
// @else
import { RootLayout } from "@/layouts/root-layout"
import { HomePage } from "@/pages/home-page"
// @endif
import { PageLoader } from "@/components/page-loader"
import { NotFoundPage } from "@/pages/not-found-page"
import { RouteErrorPage } from "@/pages/route-error-page"

export const router = createBrowserRouter([
  {
    path: "/",
    // @if admin-layout
    Component: AdminLayout,
    // @else
    Component: RootLayout,
    // @endif
    ErrorBoundary: RouteErrorPage,
    // Shown while lazy routes load on the first visit.
    HydrateFallback: PageLoader,
    children: [
      // @if admin-layout
      { index: true, Component: DashboardPage },
      // @if examples
      {
        path: "users",
        // Route-based code splitting: the page loads on first visit.
        lazy: { Component: async () => (await import("@/pages/users-page")).UsersPage },
      },
      // @endif
      {
        path: "settings",
        lazy: { Component: async () => (await import("@/pages/settings-page")).SettingsPage },
      },
      // @else
      { index: true, Component: HomePage },
      // @endif
      // @if example-pages
      {
        path: "examples",
        lazy: { Component: async () => (await import("@/pages/examples/examples-layout")).ExamplesLayout },
        children: [
          { index: true, lazy: { Component: async () => (await import("@/pages/examples/examples-index-page")).ExamplesIndexPage } },
          // @if tanstack-query
          { path: "todos", lazy: { Component: async () => (await import("@/pages/examples/todos-page")).TodosPage } },
          // @endif
          // @if forms-example
          { path: "sign-up", lazy: { Component: async () => (await import("@/pages/examples/sign-up-page")).SignUpPage } },
          // @endif
          // @if zustand
          { path: "counter", lazy: { Component: async () => (await import("@/pages/examples/counter-page")).CounterPage } },
          // @endif
        ],
      },
      // @endif
      { path: "*", Component: NotFoundPage },
    ],
  },
])
