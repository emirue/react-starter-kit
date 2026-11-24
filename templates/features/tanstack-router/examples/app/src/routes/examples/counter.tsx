// @if zustand
import { createFileRoute } from "@tanstack/react-router"

import { Counter } from "@/features/counter/components/counter"

export const Route = createFileRoute("/examples/counter")({
  component: Counter,
})
// @endif
