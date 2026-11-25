// @if testing-library
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/render"

import { ErrorBoundary } from "./error-boundary"

let shouldThrow = true
function Flaky() {
  if (shouldThrow) throw new Error("Boom")
  return <p>Recovered</p>
}

describe("ErrorBoundary", () => {
  it("shows the fallback and recovers on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    renderWithProviders(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Boom")
    shouldThrow = false
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }))
    expect(screen.getByText("Recovered")).toBeInTheDocument()
  })
})
// @endif
