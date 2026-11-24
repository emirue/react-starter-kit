// @if example-pages
import { NavLink, Outlet } from "react-router"

// @if tailwind
import { PageHeader } from "@/shared/ui/page-header"

// @endif
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

/** Layout of the /examples subtree: its child routes render into <Outlet />. */
export function ExamplesLayout() {
  return (
    // @if tailwind && admin-layout
    <div className="flex flex-col gap-6">
    // @endif
    // @if tailwind && !admin-layout
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
    // @endif
    // @if tailwind
      <PageHeader title="Examples" description="Each example shows one part of the stack." />
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
    // @else
    <div>
      <h1>Examples</h1>
      <nav aria-label="Examples">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
    // @endif
  )
}
// @endif
