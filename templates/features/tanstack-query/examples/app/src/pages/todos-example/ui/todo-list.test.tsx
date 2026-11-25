// @if testing-library && router
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ComponentProps } from "react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"

import { TodoList } from "./todo-list"

/** Keeps the filter in component state; the page keeps it in the URL. */
function TodoListWithFilter() {
  const [filter, setFilter] = useState<ComponentProps<typeof TodoList>["filter"]>("all")
  return <TodoList filter={filter} onFilterChange={setFilter} />
}

describe("TodoList", () => {
  it("loads, adds and filters todos", async () => {
    const user = userEvent.setup()
    renderWithProviders(<TodoListWithFilter />)

    expect(screen.getByRole("status", { name: "Loading todos" })).toBeInTheDocument()
    expect(await screen.findByText("Read the generated README")).toBeInTheDocument()

    await user.type(screen.getByLabelText("New todo"), "Write a test")
    await user.click(screen.getByRole("button", { name: "Add" }))
    expect(await screen.findByText("Write a test")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Done" }))
    expect(await screen.findByText("Read the generated README")).toBeInTheDocument()
    expect(screen.queryByText("Write a test")).not.toBeInTheDocument()
  })

  it("shows an error and recovers on retry", async () => {
    const user = userEvent.setup()
    renderWithProviders(<TodoListWithFilter />)
    await screen.findByText("Read the generated README")

    await user.click(screen.getByRole("button", { name: "Simulate a server error" }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    // Retrying while the server is down keeps the error.
    await user.click(await screen.findByRole("button", { name: "Retry" }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    // Restoring the server refetches and shows the list again.
    await user.click(screen.getByRole("button", { name: "Restore the server" }))
    expect(await screen.findByText("Read the generated README")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  })
})
// @endif
