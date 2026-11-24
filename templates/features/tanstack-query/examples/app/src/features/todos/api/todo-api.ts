// @if msw
import { api } from "@/lib/api-client"

import type { Todo, TodoFilter } from "../types/todo"

let serverDown = false

/** Calls /api/todos; in development and tests MSW answers (src/mocks). */
export const todoApi = {
  list: (filter: TodoFilter, signal?: AbortSignal) => {
    const headers: Record<string, string> = serverDown ? { "x-mock-error": "1" } : {}
    return api.get<Todo[]>("/todos", { query: { filter }, signal, headers })
  },
  create: (title: string) => api.post<Todo>("/todos", { title }),
  toggle: (todo: Todo) => api.patch<Todo>(`/todos/${todo.id}`, { done: !todo.done }),
  /** Makes list requests fail until restored, to demonstrate the error state. */
  setServerDown: (down: boolean) => {
    serverDown = down
  },
}
// @else
import type { Todo, TodoFilter } from "../types/todo"

// A local in-memory API so the example works without a backend.
// Replace these functions with calls to your API client.
let todos: Todo[] = [
  { id: "1", title: "Read the generated README", done: true },
  { id: "2", title: "Replace this example with your first feature", done: false },
]
let serverDown = false

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

export const todoApi = {
  async list(filter: TodoFilter, signal?: AbortSignal): Promise<Todo[]> {
    await delay(250, signal)
    if (serverDown) throw new Error("The example server is down on purpose.")
    return todos.filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done)).map((t) => ({ ...t }))
  },
  async create(title: string): Promise<Todo> {
    await delay(150)
    const todo = { id: crypto.randomUUID(), title, done: false }
    todos = [...todos, todo]
    return { ...todo }
  },
  async toggle(todo: Todo): Promise<Todo> {
    await delay(150)
    const updated = { ...todo, done: !todo.done }
    todos = todos.map((t) => (t.id === todo.id ? updated : t))
    return { ...updated }
  },
  /** Makes list requests fail until restored, to demonstrate the error state. */
  setServerDown(down: boolean) {
    serverDown = down
  },
}
// @endif
