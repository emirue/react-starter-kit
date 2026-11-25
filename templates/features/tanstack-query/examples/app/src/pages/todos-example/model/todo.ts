// @if orval
// The OpenAPI contract (openapi/openapi.yaml) is the single source of these types.
export type { Todo } from "@/shared/api/generated/model"
// @else
export interface Todo {
  id: string
  title: string
  done: boolean
}
// @endif

export const TODO_FILTERS = ["all", "open", "done"] as const
export type TodoFilter = (typeof TODO_FILTERS)[number]

export function parseTodoFilter(value: unknown): TodoFilter {
  return TODO_FILTERS.find((f) => f === value) ?? "all"
}

/** Search params of the todos page; the filter is optional so links need no `search`. */
export function validateTodosSearch(search: Record<string, unknown>): { filter?: TodoFilter } {
  return search.filter === undefined ? {} : { filter: parseTodoFilter(search.filter) }
}
