// @if testing-library
// @if shadcn || ui-primitives
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/render"

import { EmptyState, ErrorState, LoadingState } from "./state"

describe("LoadingState", () => {
  it("is a status region named by its label", () => {
    renderWithProviders(<LoadingState label="Loading users" />)
    expect(screen.getByRole("status", { name: "Loading users" })).toBeInTheDocument()
  })
})

describe("ErrorState", () => {
  it("is an alert with the error message and a retry button", async () => {
    const onRetry = vi.fn()
    renderWithProviders(<ErrorState error={new Error("The server is down.")} onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("The server is down.")
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("has no retry button without onRetry", () => {
    renderWithProviders(<ErrorState error={new Error("Nope")} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Nope")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("EmptyState", () => {
  it("shows the title and the optional description", () => {
    renderWithProviders(<EmptyState title="No users yet" description="Add the first one." />)
    expect(screen.getByText("No users yet")).toBeInTheDocument()
    expect(screen.getByText("Add the first one.")).toBeInTheDocument()
  })

  it("is not announced as a status or an alert", () => {
    renderWithProviders(<EmptyState title="Nothing here" />)
    expect(screen.getByText("Nothing here")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
// @endif
// @endif
