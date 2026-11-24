// @if router && !admin-layout
// @if react-router && example-pages
import { Link, NavLink, Outlet } from "react-router"
// @endif
// @if react-router && !example-pages
import { Link, Outlet } from "react-router"
// @endif
// @if tanstack-router && example-pages
import { Link, Link as NavLink, Outlet } from "@tanstack/react-router"
// @endif
// @if tanstack-router && !example-pages
import { Link, Outlet } from "@tanstack/react-router"
// @endif

// @if theme
import { ModeToggle } from "@/components/theme/mode-toggle"
// @endif
import { env } from "@/config/env"

// @if tailwind && example-pages
const navLink =
  "rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground"

// @endif
export function RootLayout() {
  return (
    // @if tailwind
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-6">
          <nav aria-label="Main" className="flex items-center gap-4">
            <Link to="/" className="font-semibold">
              {env.appName}
            </Link>
            {/* @if example-pages */}
            <NavLink to="/examples" className={navLink}>
              Examples
            </NavLink>
            {/* @endif */}
          </nav>
          {/* @if theme */}
          <ModeToggle />
          {/* @endif */}
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
    // @else
    <>
      <header>
        <nav aria-label="Main">
          <Link to="/">{env.appName}</Link>
          {/* @if example-pages */}
          <NavLink to="/examples">Examples</NavLink>
          {/* @endif */}
        </nav>
      </header>
      <Outlet />
    </>
    // @endif
  )
}
// @endif
