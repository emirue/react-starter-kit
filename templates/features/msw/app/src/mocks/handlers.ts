import { http, HttpResponse } from "msw"

// @if tanstack-query && example-pages
import type { Todo } from "@/pages/todos-example"

const SEED: Todo[] = [
  { id: "1", title: "Read the generated README", done: true },
  { id: "2", title: "Replace this example with your first feature", done: false },
]
let todos: Todo[] = SEED.map((t) => ({ ...t }))

/** Restores the seed data (called between tests). */
export function resetMockData() {
  todos = SEED.map((t) => ({ ...t }))
}

/** Mock API handlers shared by the browser (development) and Node (tests). */
export const handlers = [
  http.get("*/api/todos", ({ request }) => {
    if (request.headers.get("x-mock-error")) return HttpResponse.json({ message: "Mock server error" }, { status: 500 })
    const filter = new URL(request.url).searchParams.get("filter") ?? "all"
    return HttpResponse.json(todos.filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done)))
  }),
  http.post("*/api/todos", async ({ request }) => {
    const { title } = (await request.json()) as { title: string }
    const todo = { id: crypto.randomUUID(), title, done: false }
    todos = [...todos, todo]
    return HttpResponse.json(todo, { status: 201 })
  }),
  http.patch("*/api/todos/:id", async ({ params, request }) => {
    const patch = (await request.json()) as Partial<Todo>
    const todo = todos.find((t) => t.id === params.id)
    if (!todo) return HttpResponse.json({ message: "Not found" }, { status: 404 })
    Object.assign(todo, patch)
    return HttpResponse.json(todo)
  }),
]
// @else
/** Restores mock data between tests. */
export function resetMockData() {}

/** Mock API handlers shared by the browser (development) and Node (tests). */
export const handlers = [http.get("*/api/health", () => HttpResponse.json({ ok: true }))]
// @endif
