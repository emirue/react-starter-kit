// @if example-pages
import { createFileRoute } from "@tanstack/react-router"

import { ExamplesLayout } from "@/app/layouts/examples-layout"

export const Route = createFileRoute("/examples")({ component: ExamplesLayout })
// @endif
