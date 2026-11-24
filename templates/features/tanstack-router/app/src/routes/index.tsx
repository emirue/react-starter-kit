import { createFileRoute } from "@tanstack/react-router"

// @if admin-layout
import { DashboardPage } from "@/pages/dashboard-page"

export const Route = createFileRoute("/")({
  component: DashboardPage,
})
// @else
import { HomePage } from "@/pages/home-page"

export const Route = createFileRoute("/")({
  component: HomePage,
})
// @endif
