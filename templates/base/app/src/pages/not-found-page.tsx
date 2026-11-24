// @if router
// @if react-router
import { Link } from "react-router"
// @endif
// @if tanstack-router
import { Link } from "@tanstack/react-router"
// @endif

export function NotFoundPage() {
  return (
    // @if tailwind
    <div className="mx-auto flex max-w-xl flex-col items-start gap-3 px-6 py-16">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist or was moved.</p>
      <Link to="/" className="font-medium underline underline-offset-4">
        Go to the home page
      </Link>
    </div>
    // @else
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/">Go to the home page</Link>
    </main>
    // @endif
  )
}
// @endif
