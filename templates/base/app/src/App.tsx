// @if react-router
import { RouterProvider } from "react-router/dom"

// @endif
// @if tanstack-router
import { RouterProvider } from "@tanstack/react-router"

// @endif
// @if providers
import { AppProviders } from "@/app/providers"
// @endif
// @if router
import { router } from "@/app/router"
// @else
import { HomePage } from "@/pages/home-page"
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
      <HomePage />
    </AppProviders>
  )
  // @endif
  // @if !providers && router
  return <RouterProvider router={router} />
  // @endif
  // @if !providers && !router
  return <HomePage />
  // @endif
}
