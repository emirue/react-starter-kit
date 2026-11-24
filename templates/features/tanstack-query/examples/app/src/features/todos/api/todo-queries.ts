import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

import type { TodoFilter } from "../types/todo"
import { todoApi } from "./todo-api"

/** Query key factory: every todo query key starts with todoKeys.all. */
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filter: TodoFilter) => [...todoKeys.lists(), filter] as const,
}

export const todosQueryOptions = (filter: TodoFilter) =>
  queryOptions({
    queryKey: todoKeys.list(filter),
    queryFn: ({ signal }) => todoApi.list(filter, signal),
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
