// @if tanstack-query
// @if react-router
import { useSearchParams } from "react-router"
// @endif
// @if tanstack-router
import { getRouteApi } from "@tanstack/react-router"
// @endif

// @if react-router
import { parseTodoFilter } from "../model/todo"
// @endif
import { TodoList } from "./todo-list"
// @if tanstack-router

const route = getRouteApi("/examples/todos")
// @endif

/** The filter lives in the URL (?filter=open), so it survives reloads and sharing. */
export function TodosPage() {
  // @if react-router
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseTodoFilter(searchParams.get("filter"))
  return (
    <TodoList
      filter={filter}
      onFilterChange={(next) => setSearchParams(next === "all" ? {} : { filter: next }, { replace: true })}
    />
  )
  // @endif
  // @if tanstack-router
  const { filter = "all" } = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <TodoList
      filter={filter}
      onFilterChange={(next) => void navigate({ search: next === "all" ? {} : { filter: next }, replace: true })}
    />
  )
  // @endif
}
// @endif
