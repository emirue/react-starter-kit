import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

import { usersApi } from "./users-api"

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
}

export const usersQueryOptions = () => queryOptions({ queryKey: userKeys.list(), queryFn: usersApi.list })

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}
