// @if testing-library
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { App } from "./app"

describe("App", () => {
  it("renders the start page", async () => {
    render(<App />)
    // @if admin-layout
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    // @else
    expect(await screen.findByRole("heading", { level: 1, name: "{{appName}}" })).toBeInTheDocument()
    // @endif
  })
})
// @endif
