import { UsersTable } from "@/features/users/components/users-table"

export function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Search, sort and page through users, or add one.</p>
      </div>
      <UsersTable />
    </div>
  )
}
