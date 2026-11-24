import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

import type { TodoFilter } from "../model/todo"
import { todoApi } from "./todo-api"

/** Query key factory: every todo query key starts with todoKeys.all. */
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filter: TodoFilter, simulateError = false) => [...todoKeys.lists(), { filter, simulateError }] as const,
}

/** `simulateError` is part of the key, so switching it refetches and caches separately. */
export const todosQueryOptions = (filter: TodoFilter, simulateError = false) =>
  queryOptions({
    queryKey: todoKeys.list(filter, simulateError),
    queryFn: ({ signal }) => todoApi.list(filter, { signal, simulateError }),
  })

export function useCreateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: todoApi.create,
    // Every filtered list may change, so invalidate them all.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.lists() }),
  })
}

export function useToggleTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: todoApi.toggle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.lists() }),
  })
}
