import { useQuery } from "@tanstack/react-query"
import { useId, useState, type FormEvent } from "react"

import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/state"

import { todosQueryOptions, useCreateTodo, useToggleTodo } from "../api/todo-queries"
import { TODO_FILTERS, type TodoFilter } from "../model/todo"

interface TodoListProps {
  filter: TodoFilter
  onFilterChange: (filter: TodoFilter) => void
}

export function TodoList({ filter, onFilterChange }: TodoListProps) {
  // Demo switch: asks the example server to fail, to show the error state.
  const [serverDown, setServerDown] = useState(false)
  const todos = useQuery(todosQueryOptions(filter, serverDown))
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()
  const [title, setTitle] = useState("")
  const inputId = useId()

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={inputId}>New todo</Label>
            <Input id={inputId} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
          </div>
          <Button type="submit" disabled={createTodo.isPending}>
            {createTodo.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
        {createTodo.isError && <ErrorState error={createTodo.error} />}

        <div role="group" aria-label="Filter todos" className="flex flex-wrap gap-1">
          {TODO_FILTERS.map((f) => (
            <Button key={f} size="sm" variant={f === filter ? "secondary" : "ghost"} aria-pressed={f === filter} onClick={() => onFilterChange(f)}>
              {f[0]!.toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {todos.isPending && <LoadingState label="Loading todos" />}
        {todos.isError && <ErrorState error={todos.error} onRetry={() => void todos.refetch()} />}
        {todos.isSuccess && todos.data.length === 0 && <EmptyState title="Nothing here yet" description="Add a todo or change the filter." />}
        {todos.isSuccess && todos.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {todos.data.map((todo) => (
              <li key={todo.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={todo.done}
                    // Only the todo being saved is locked.
                    disabled={toggleTodo.isPending && toggleTodo.variables?.id === todo.id}
                    onChange={() => toggleTodo.mutate(todo)}
                  />
                  <span className={todo.done ? "text-muted-foreground line-through" : undefined}>{todo.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Button size="sm" variant="outline" onClick={() => setServerDown((down) => !down)}>
            {serverDown ? "Restore the server" : "Simulate a server error"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
