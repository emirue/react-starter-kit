// @if tanstack-query
import { createFileRoute } from "@tanstack/react-router"

import { TodosPage, validateTodosSearch } from "@/pages/todos-example"

export const Route = createFileRoute("/examples/todos")({ validateSearch: validateTodosSearch, component: TodosPage })
// @endif
