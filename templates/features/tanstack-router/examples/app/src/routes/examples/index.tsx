// @if example-pages
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/examples/")({
  component: () => (
    <p className="text-muted-foreground">Pick an example above. Each one lives in src/features and can be deleted on its own.</p>
  ),
})
// @endif
