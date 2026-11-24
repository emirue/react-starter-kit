// @if testing-library
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SignUpForm } from "./sign-up-form"

async function fill(values: { name: string; email: string; password: string; confirm: string }) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Name"), values.name)
  await user.type(screen.getByLabelText("Email"), values.email)
  await user.type(screen.getByLabelText("Password"), values.password)
  await user.type(screen.getByLabelText("Confirm password"), values.confirm)
  await user.click(screen.getByRole("button", { name: "Sign up" }))
}

describe("SignUpForm", () => {
  it("shows field errors for invalid input", async () => {
    render(<SignUpForm />)
    await fill({ name: "A", email: "nope", password: "short", confirm: "other" })

    expect(await screen.findByText("Enter at least 2 characters.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument()
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
  })

  it("submits valid input", async () => {
    render(<SignUpForm />)
    await fill({ name: "Ada", email: "ada@example.com", password: "correct horse", confirm: "correct horse" })
    expect(await screen.findByText("Welcome, Ada!")).toBeInTheDocument()
  })

  it("shows errors returned by the server", async () => {
    render(<SignUpForm />)
    await fill({ name: "Ada", email: "taken@example.com", password: "correct horse", confirm: "correct horse" })
    expect(await screen.findByText("This email is already registered.")).toBeInTheDocument()
  })
})
// @endif
