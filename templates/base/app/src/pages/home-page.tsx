// @if !admin-layout
// @if examples && router && react-router
import { Link } from "react-router"
// @endif
// @if examples && router && tanstack-router
import { Link } from "@tanstack/react-router"
// @endif

// @if examples && !router && tanstack-query
import { TodoExample } from "@/features/todos/components/todo-list"
// @endif
// @if examples && !router && forms-example
import { SignUpForm } from "@/features/sign-up/components/sign-up-form"
// @endif
// @if examples && !router && zustand
import { Counter } from "@/features/counter/components/counter"
// @endif
// @if pkg-shared || pkg-types || pkg-ui
import { WorkspacePackages } from "@/components/workspace-packages"
// @endif

const STACK: { name: string; version?: string }[] = [
{{stackItems}}
]
// @if examples && router

const EXAMPLES = [
  // @if tanstack-query
  { to: "/examples/todos", title: "Server state", description: "TanStack Query: loading, errors, mutations and cache invalidation." },
  // @endif
  // @if forms-example
  { to: "/examples/sign-up", title: "Forms", description: "React Hook Form with a Zod schema and accessible errors." },
  // @endif
  // @if zustand
  { to: "/examples/counter", title: "Client state", description: "A Zustand store with selectors and persisted preferences." },
  // @endif
] as const
// @endif

export function HomePage() {
  return (
    // @if tailwind
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Welcome to</p>
        <h1 className="text-4xl font-semibold tracking-tight">{{appName}}</h1>
        <p className="max-w-2xl text-muted-foreground">
          Edit <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">src/pages/home-page.tsx</code> and save to
          reload.
        </p>
      </section>

      <section aria-labelledby="stack-heading" className="flex flex-col gap-4">
        <h2 id="stack-heading" className="text-lg font-semibold">
          Technology stack
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((item) => (
            <li key={item.name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{item.name}</span>
              {item.version && <span className="font-mono text-xs text-muted-foreground">{item.version}</span>}
            </li>
          ))}
        </ul>
      </section>
      // @if pkg-shared || pkg-types || pkg-ui

      <WorkspacePackages />
      // @endif
      // @if examples && router

      <section aria-labelledby="examples-heading" className="flex flex-col gap-4">
        <h2 id="examples-heading" className="text-lg font-semibold">
          Examples
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXAMPLES.map((example) => (
            <li key={example.to}>
              <Link
                to={example.to}
                className="flex h-full flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="font-medium">{example.title}</span>
                <span className="text-sm text-muted-foreground">{example.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      // @endif
      // @if examples && !router && tanstack-query
      <TodoExample />
      // @endif
      // @if examples && !router && forms-example
      <SignUpForm />
      // @endif
      // @if examples && !router && zustand
      <Counter />
      // @endif
    </div>
    // @else
    <main className="page">
      <h1>{{appName}}</h1>
      <p>
        Edit <code>src/pages/home-page.tsx</code> and save to reload.
      </p>
      <h2>Technology stack</h2>
      <ul className="stack">
        {STACK.map((item) => (
          <li key={item.name}>
            {item.name}
            {item.version && <small> {item.version}</small>}
          </li>
        ))}
      </ul>
      // @if examples && !router && tanstack-query
      <TodoExample />
      // @endif
      // @if examples && !router && forms-example
      <SignUpForm />
      // @endif
      // @if examples && !router && zustand
      <Counter />
      // @endif
    </main>
    // @endif
  )
}
// @endif
