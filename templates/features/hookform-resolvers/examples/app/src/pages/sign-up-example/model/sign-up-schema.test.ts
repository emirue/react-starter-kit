// @if vitest && router
import { describe, expect, it } from "vitest"

import { signUpSchema } from "./sign-up-schema"

describe("signUpSchema", () => {
  it("requires matching passwords", () => {
    const result = signUpSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "12345678", confirmPassword: "x" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"])
  })

  it("trims the name", () => {
    const result = signUpSchema.parse({ name: "  Ada ", email: "ada@example.com", password: "12345678", confirmPassword: "12345678" })
    expect(result.name).toBe("Ada")
  })
})
// @endif
