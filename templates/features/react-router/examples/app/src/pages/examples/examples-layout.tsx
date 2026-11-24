// @if example-pages
import { NavLink, Outlet } from "react-router"

const LINKS = [
  // @if tanstack-query
  { to: "todos", label: "Server state" },
  // @endif
  // @if forms-example
  { to: "sign-up", label: "Forms" },
  // @endif
  // @if zustand
  { to: "counter", label: "Client state" },
  // @endif
]

/** A nested layout: its child routes render into <Outlet />. */
export function ExamplesLayout() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Examples</h1>
      <nav aria-label="Examples" className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
// @endif
