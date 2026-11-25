// @if testing-library
// @if shadcn || ui-primitives
import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"

import { PageHeader } from "./page-header"

describe("PageHeader", () => {
  it("renders the page title as the only h1, with description and actions", () => {
    renderWithProviders(<PageHeader title="Users" description="Everyone with access." actions={<button type="button">Add user</button>} />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { level: 1, name: "Users" })).toBeInTheDocument()
    expect(screen.getByText("Everyone with access.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument()
  })

  it("renders only the title when nothing else is given", () => {
    const { container } = renderWithProviders(<PageHeader title="Settings" />)
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument()
    expect(container).toHaveTextContent(/^Settings$/)
  })
})
// @endif
// @endif
