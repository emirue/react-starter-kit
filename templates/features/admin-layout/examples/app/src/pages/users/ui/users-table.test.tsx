// @if testing-library
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"

import { UsersTable } from "./users-table"

describe("UsersTable", () => {
  it("paginates, searches and shows an empty state", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UsersTable />)
    expect(screen.getByRole("status", { name: /loading users/i })).toBeInTheDocument()
    expect(await screen.findByText("Page 1 of 5")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument()

    await user.type(screen.getByLabelText("Search users"), "hopper")
    expect(screen.getAllByText(/Hopper/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Lovelace/)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText("Search users"))
    await user.type(screen.getByLabelText("Search users"), "nobody-at-all")
    expect(screen.getByText(/No users match/)).toBeInTheDocument()
  })

  it("adds a user through the dialog", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UsersTable />)
    await screen.findByText("Page 1 of 5")
    await user.click(screen.getByRole("button", { name: "Add user" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Add user" }))
    expect(await within(dialog).findByText("Enter at least 2 characters.")).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText("Name"), "Katherine Johnson")
    await user.type(within(dialog).getByLabelText("Email"), "katherine@example.com")
    await user.click(within(dialog).getByRole("button", { name: "Add user" }))
    expect(await screen.findByText("Katherine Johnson")).toBeInTheDocument()
  })
})
// @endif
