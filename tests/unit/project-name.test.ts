import { describe, expect, it } from "vitest"

import { toValidPackageName, validatePackageName } from "../../src/utils/project-name.ts"

describe("validatePackageName", () => {
  it.each(["my-app", "web", "app.v2", "@acme/web", "a_b"])("accepts %s", (name) => {
    expect(validatePackageName(name)).toBeUndefined()
  })

  it.each([
    ["", /empty/],
    ["My-App", /lowercase/],
    ["my app", /lowercase letters, digits/],
    [".hidden", /start/],
    ["_x", /start/],
    ["../x", /start/],
    ["a/../b", /lowercase letters, digits/],
    ["node_modules", /reserved/],
    ["a".repeat(215), /214/],
    ["앱", /lowercase letters, digits/],
  ])("rejects %j", (name, message) => {
    expect(validatePackageName(name)).toMatch(message)
  })
})

describe("toValidPackageName", () => {
  it("suggests a valid name", () => {
    expect(toValidPackageName("My Cool App")).toBe("my-cool-app")
    expect(toValidPackageName("..weird__")).toBe("weird")
  })
})
