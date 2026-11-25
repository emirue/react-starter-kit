// @if example-pages
import { Link, Outlet } from "@tanstack/react-router"

// @if tailwind
import { PageHeader } from "@/shared/ui/page-header"

const linkClass =
  "rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted data-[status=active]:bg-muted data-[status=active]:font-medium"
// @endif

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
        {/* @if tanstack-query */}
        <Link to="/examples/todos" className={linkClass}>
          Server state
        </Link>
        {/* @endif */}
        {/* @if forms-example */}
        <Link to="/examples/sign-up" className={linkClass}>
          Forms
        </Link>
        {/* @endif */}
        {/* @if zustand */}
        <Link to="/examples/counter" className={linkClass}>
          Client state
        </Link>
        {/* @endif */}
      </nav>
      <Outlet />
    </div>
    // @else
    <div>
      <h1>Examples</h1>
      <nav aria-label="Examples">
        {/* @if tanstack-query */}
        <Link to="/examples/todos">Server state</Link>
        {/* @endif */}
        {/* @if forms-example */}
        <Link to="/examples/sign-up">Forms</Link>
        {/* @endif */}
        {/* @if zustand */}
        <Link to="/examples/counter">Client state</Link>
        {/* @endif */}
      </nav>
      <Outlet />
    </div>
    // @endif
  )
}
// @endif
