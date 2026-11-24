// @if zustand
import { createFileRoute } from "@tanstack/react-router"

import { CounterPage } from "@/pages/counter-example"

export const Route = createFileRoute("/examples/counter")({ component: CounterPage })
// @endif
