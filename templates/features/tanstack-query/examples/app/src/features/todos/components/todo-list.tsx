import { useQuery } from "@tanstack/react-query"
import { useId, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
// @if api-client
import { getErrorMessage } from "@/lib/api-error"
// @endif

import { todoApi } from "../api/todo-api"
import { todosQueryOptions, useCreateTodo, useToggleTodo } from "../api/todo-queries"
import { TODO_FILTERS, type TodoFilter } from "../types/todo"
// @if !api-client

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.")
// @endif

interface TodoListProps {
  filter: TodoFilter
  onFilterChange: (filter: TodoFilter) => void
}

export function TodoList({ filter, onFilterChange }: TodoListProps) {
  const todos = useQuery(todosQueryOptions(filter))
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()
  const [title, setTitle] = useState("")
  const [serverDown, setServerDown] = useState(false)
  const inputId = useId()

  function toggleServer() {
    todoApi.setServerDown(!serverDown)
    setServerDown(!serverDown)
    void todos.refetch()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    createTodo.mutate(value, { onSuccess: () => setTitle("") })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Server state</h2>
        </CardTitle>
        <CardDescription>TanStack Query with loading, error, mutation and cache invalidation.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={inputId}>New todo</Label>
            <Input id={inputId} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
          </div>
          <Button type="submit" disabled={createTodo.isPending}>
            {createTodo.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
        {createTodo.isError && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(createTodo.error)}
          </p>
        )}

        <div role="group" aria-label="Filter todos" className="flex gap-1">
          {TODO_FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={f === filter ? "secondary" : "ghost"}
              aria-pressed={f === filter}
              onClick={() => onFilterChange(f)}
            >
              {f[0]!.toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {todos.isPending && (
          <div aria-busy="true" aria-label="Loading todos" className="flex flex-col gap-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        )}
        {todos.isError && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
            <span>{getErrorMessage(todos.error)}</span>
            <Button size="sm" variant="outline" onClick={() => void todos.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {todos.isSuccess && todos.data.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
        {todos.isSuccess && todos.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {todos.data.map((todo) => (
              <li key={todo.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={todo.done}
                    disabled={toggleTodo.isPending}
                    onChange={() => toggleTodo.mutate(todo)}
                  />
                  <span className={todo.done ? "text-muted-foreground line-through" : undefined}>{todo.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Button size="sm" variant="outline" onClick={toggleServer}>
            {serverDown ? "Restore the server" : "Simulate a server error"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** TodoList with the filter kept in component state (used when there is no router). */
export function TodoExample() {
  const [filter, setFilter] = useState<TodoFilter>("all")
  return <TodoList filter={filter} onFilterChange={setFilter} />
}
