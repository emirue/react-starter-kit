export interface Todo {
  id: string
  title: string
  done: boolean
}

export const TODO_FILTERS = ["all", "open", "done"] as const
export type TodoFilter = (typeof TODO_FILTERS)[number]

export function parseTodoFilter(value: unknown): TodoFilter {
  return TODO_FILTERS.find((f) => f === value) ?? "all"
}
