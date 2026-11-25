// @if orval
import { createTodo, listTodos, updateTodo } from "@/shared/api/generated/api"

import type { Todo, TodoFilter } from "../model/todo"

/** Options every request accepts; `simulateError` asks the mock server to fail. */
export interface TodoRequestOptions {
  signal?: AbortSignal
  simulateError?: boolean
}

const mockHeaders = (o: TodoRequestOptions) => (o.simulateError ? { "x-mock-error": "1" } : undefined)

/** Calls the generated client for /api/todos; MSW answers in development and tests (src/mocks). */
export const todoApi = {
  // @if axios
  list: (filter: TodoFilter, o: TodoRequestOptions = {}): Promise<Todo[]> =>
    listTodos({ filter }, { signal: o.signal, headers: mockHeaders(o) }),
  create: (title: string): Promise<Todo> => createTodo({ title }),
  toggle: (todo: Todo): Promise<Todo> => updateTodo(todo.id, { done: !todo.done }),
  // @else
  list: async (filter: TodoFilter, o: TodoRequestOptions = {}): Promise<Todo[]> =>
    (await listTodos({ filter }, { signal: o.signal, headers: mockHeaders(o) })).data,
  create: async (title: string): Promise<Todo> => (await createTodo({ title })).data,
  toggle: async (todo: Todo): Promise<Todo> => {
    const response = await updateTodo(todo.id, { done: !todo.done })
    // The contract also allows 404; the http client already threw for it.
    return response.data as Todo
  },
  // @endif
}
// @endif
// @if msw && !orval
import { api } from "@/shared/api/http-client"

import type { Todo, TodoFilter } from "../model/todo"

/** Options every request accepts; `simulateError` asks the mock server to fail. */
export interface TodoRequestOptions {
  signal?: AbortSignal
  simulateError?: boolean
}

/** Calls /api/todos; MSW answers in development and tests (src/mocks). */
export const todoApi = {
  list: (filter: TodoFilter, o: TodoRequestOptions = {}) =>
    api.get<Todo[]>("/todos", { query: { filter }, signal: o.signal, headers: o.simulateError ? { "x-mock-error": "1" } : undefined }),
  create: (title: string) => api.post<Todo>("/todos", { title }),
  toggle: (todo: Todo) => api.patch<Todo>(`/todos/${todo.id}`, { done: !todo.done }),
}
// @endif
// @if !msw
import type { Todo, TodoFilter } from "../model/todo"

/** Options every request accepts; `simulateError` makes the example server fail. */
export interface TodoRequestOptions {
  signal?: AbortSignal
  simulateError?: boolean
}

// A local in-memory API so the example works without a backend.
// Replace these functions with calls to your API client.
let todos: Todo[] = [
  { id: "1", title: "Read the generated README", done: true },
  { id: "2", title: "Replace this example with your first feature", done: false },
]

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
  async list(filter: TodoFilter, o: TodoRequestOptions = {}): Promise<Todo[]> {
    await delay(250, o.signal)
    if (o.simulateError) throw new Error("The example server is down on purpose.")
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
}
// @endif
