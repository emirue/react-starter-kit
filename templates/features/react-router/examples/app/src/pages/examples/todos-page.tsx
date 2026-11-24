// @if tanstack-query
import { useSearchParams } from "react-router"

import { TodoList } from "@/features/todos/components/todo-list"
import { parseTodoFilter } from "@/features/todos/types/todo"

/** The filter lives in the URL (?filter=open), so it survives reloads and sharing. */
export function TodosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseTodoFilter(searchParams.get("filter"))
  return (
    <TodoList
      filter={filter}
      onFilterChange={(next) => setSearchParams(next === "all" ? {} : { filter: next }, { replace: true })}
    />
  )
}
// @endif
