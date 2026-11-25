// @if react-router
import { RouterProvider } from "react-router/dom"

// @endif
// @if tanstack-router
import { RouterProvider } from "@tanstack/react-router"

// @endif
// @if providers
import { AppProviders } from "./providers"
// @endif
// @if router
import { router } from "./router"
// @else
import { HomePage } from "@/pages/home"
// @endif

export function App() {
  // @if providers && router
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
  // @endif
  // @if providers && !router
  return (
    <AppProviders>
      {/* Without a router there is no layout, so the landmark is set here. */}
      <main>
        <HomePage />
      </main>
    </AppProviders>
  )
  // @endif
  // @if !providers && router
  return <RouterProvider router={router} />
  // @endif
  // @if !providers && !router
  return (
    <main>
      <HomePage />
    </main>
  )
  // @endif
}
