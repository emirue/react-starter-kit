import { PageHeader } from "@/shared/ui/page-header"

import { UsersTable } from "./users-table"

export function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" description="Search, sort and page through users, or add one." />
      <UsersTable />
    </div>
  )
}
