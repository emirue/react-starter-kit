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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { usersQueryOptions } from "../api/user-queries"
import type { User } from "../types/user"
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex w-full max-w-xs flex-col gap-1.5">
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
            {users.isPending &&
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {users.isError && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div role="alert" className="flex items-center justify-between gap-2 py-4">
                    <span>Could not load users.</span>
                    <Button size="sm" variant="outline" onClick={() => void users.refetch()}>
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {users.isSuccess && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  No users match “{globalFilter}”.
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

      <nav aria-label="Pagination" className="flex items-center justify-end gap-2 text-sm">
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
