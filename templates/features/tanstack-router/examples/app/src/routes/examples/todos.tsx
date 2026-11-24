// @if tanstack-query
import { createFileRoute } from "@tanstack/react-router"

import { TodoList } from "@/features/todos/components/todo-list"
import { parseTodoFilter, type TodoFilter } from "@/features/todos/types/todo"

export const Route = createFileRoute("/examples/todos")({
  // The filter lives in the URL (?filter=open), validated on every navigation.
  // It is optional, so links to this page do not need a `search` prop.
  validateSearch: (search: Record<string, unknown>): { filter?: TodoFilter } =>
    search.filter === undefined ? {} : { filter: parseTodoFilter(search.filter) },
  component: TodosPage,
})

function TodosPage() {
  const { filter = "all" } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <TodoList
      filter={filter}
      onFilterChange={(next) => void navigate({ search: next === "all" ? {} : { filter: next }, replace: true })}
    />
  )
}
// @endif
