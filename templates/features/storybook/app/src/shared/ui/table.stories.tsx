// @if admin-layout
import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge } from "./badge"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./table"

const ROWS = [
  { name: "Ada Lovelace", email: "ada@example.com", role: "admin" },
  { name: "Grace Hopper", email: "grace@example.com", role: "editor" },
  { name: "Alan Turing", email: "alan@example.com", role: "viewer" },
]

/** Wide tables scroll inside their own container, so the page never scrolls sideways. */
const meta = {
  title: "shared/ui/Table",
  component: Table,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="rounded-lg border">
      <Table>
        <TableCaption>Team members</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.email}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.role}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
}

export const Mobile: Story = { ...Default, globals: { viewport: { value: "mobile1" } } }
// @endif
