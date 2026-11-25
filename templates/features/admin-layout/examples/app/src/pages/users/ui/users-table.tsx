import { useQuery } from "@tanstack/react-query"
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useId, useState } from "react"

import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"

import { usersQueryOptions } from "../api/user-queries"
import type { User } from "../model/user"
import { CreateUserDialog } from "./create-user-dialog"

// Module scope: stable references, so row models are not rebuilt on every render.
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { text: sortFn_text },
})

const helper = createColumnHelper<typeof features, User>()
const columns = helper.columns([
  helper.accessor("name", { header: "Name", sortFn: "text" }),
  helper.accessor("email", { header: "Email", sortFn: "text" }),
  helper.accessor("role", {
    header: "Role",
    sortFn: "text",
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),
])

const EMPTY: User[] = []

export function UsersTable() {
  const users = useQuery(usersQueryOptions())
  const [globalFilter, setGlobalFilter] = useState("")
  const searchId = useId()
  const table = useTable({
    features,
    columns,
    data: users.data ?? EMPTY,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
          <label htmlFor={searchId} className="text-sm font-medium">
            Search users
          </label>
          <Input id={searchId} type="search" value={globalFilter} onChange={(e) => table.setGlobalFilter(e.target.value)} />
        </div>
        <CreateUserDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}>
                      <Button variant="ghost" size="sm" className="-ml-2" onClick={header.column.getToggleSortingHandler()}>
                        <table.FlexRender header={header} />
                        {sorted === "asc" ? <ArrowUp aria-hidden="true" /> : sorted === "desc" ? <ArrowDown aria-hidden="true" /> : <ArrowUpDown aria-hidden="true" />}
                      </Button>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {users.isPending && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <LoadingState label="Loading users" rows={5} />
                </TableCell>
              </TableRow>
            )}
            {users.isError && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <ErrorState error={users.error} onRetry={() => void users.refetch()} />
                </TableCell>
              </TableRow>
            )}
            {users.isSuccess && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  {globalFilter ? (
                    <EmptyState title={`No users match “${globalFilter}”`} description="Try another search." />
                  ) : (
                    <EmptyState title="No users yet" description="Add the first user." />
                  )}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-end gap-2 text-sm">
        <span className="text-muted-foreground" aria-live="polite">
          Page {table.state.pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
        </span>
        <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </nav>
    </div>
  )
}
